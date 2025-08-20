"use client";
import React, { useState, useEffect } from "react";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Trash2, Save, X, Building2, Bot, Mail, Phone, MapPin } from "lucide-react";
import { getAllActiveCenters, upsertCenterConfig, deleteCenterConfig } from "@/lib/centerConfig";
import { createLogContext, logDebug, logError } from "@/lib/logger";
import type { CenterConfig } from "@/types/center-config";

/**
 * 센터 설정 관리 페이지
 * 각 센터의 고유한 설정(카카오봇 ID, 연락처, 주소 등)을 관리합니다.
 */
export default function SettingsPage() {
  const [centers, setCenters] = useState<CenterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCenter, setEditingCenter] = useState<CenterConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // 페이지 로드 시 센터 목록 조회
  useEffect(() => {
    loadCenters();
  }, []);

  /**
   * 센터 목록을 불러옵니다
   */
  const loadCenters = async () => {
    const logCtx = createLogContext('SettingsPage', 'loadCenters');
    logDebug(logCtx, '센터 목록 조회 시작');
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAllActiveCenters();
      logDebug({ ...logCtx, state: 'success' }, `센터 목록 조회 완료`, { count: data.length });
      setCenters(data);
    } catch (err) {
      const error = err as Error;
      logError({ ...logCtx, error, state: 'error' });
      setError("센터 목록을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 새 센터 추가 모드를 시작합니다
   */
  const handleAddNew = () => {
    const newCenter: CenterConfig = {
      id: "",
      center_name: "",
      kakao_bot_id: "",
      kakao_channel_id: "",
      center_address: "",
      center_phone: "",
      center_email: "",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setEditingCenter(newCenter);
    setIsAddingNew(true);
  };

  /**
   * 센터 편집 모드를 시작합니다
   */
  const handleEdit = (center: CenterConfig) => {
    setEditingCenter({ ...center });
    setIsAddingNew(false);
  };

  /**
   * 편집 모드를 취소합니다
   */
  const handleCancel = () => {
    setEditingCenter(null);
    setIsAddingNew(false);
  };

  /**
   * 센터 설정을 저장합니다
   */
  const handleSave = async () => {
    if (!editingCenter) return;

    const logCtx = createLogContext('SettingsPage', 'handleSave');
    logDebug(logCtx, '센터 설정 저장 시작', { centerName: editingCenter.center_name, isAddingNew });
    
    setSaving(true);
    
    try {
      // 필수 필드 검증
      if (!editingCenter.center_name.trim()) {
        throw new Error("센터명은 필수입니다.");
      }
      if (!editingCenter.kakao_bot_id.trim()) {
        throw new Error("카카오봇 ID는 필수입니다.");
      }

      const savedCenter = await upsertCenterConfig(editingCenter);
      logDebug({ ...logCtx, state: 'success' }, '센터 설정 저장 완료', { savedCenter });
      
      // 목록 업데이트
      if (isAddingNew) {
        setCenters(prev => [...prev, savedCenter]);
      } else {
        setCenters(prev => prev.map(c => c.id === savedCenter.id ? savedCenter : c));
      }
      
      setEditingCenter(null);
      setIsAddingNew(false);
    } catch (err) {
      const error = err as Error;
      logError({ ...logCtx, error, state: 'error' });
      setError(error.message || "센터 설정을 저장하는데 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * 입력 필드 값을 업데이트합니다
   */
  const handleInputChange = (field: keyof CenterConfig, value: string | boolean) => {
    if (!editingCenter) return;
    setEditingCenter(prev => prev ? { ...prev, [field]: value } : null);
  };

  /**
   * 센터를 삭제합니다 (소프트 삭제)
   */
  const handleDelete = async (centerId: string, centerName: string) => {
    const logCtx = createLogContext('SettingsPage', 'handleDelete');
    logDebug(logCtx, '센터 삭제 시작', { centerId, centerName });
    
    if (!confirm(`"${centerName}" 센터를 삭제하시겠습니까?\n\n삭제된 센터는 복구할 수 없습니다.`)) {
      return;
    }
    
    setDeleting(centerId);
    
    try {
      await deleteCenterConfig(centerId);
      logDebug({ ...logCtx, state: 'success' }, '센터 삭제 완료');
      
      // 목록에서 제거
      setCenters(prev => prev.filter(c => c.id !== centerId));
    } catch (err) {
      const error = err as Error;
      logError({ ...logCtx, error, state: 'error' });
      setError("센터를 삭제하는데 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">센터 목록을 불러오는 중...</div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">센터 설정</h1>
            <p className="text-gray-600 mt-1">각 센터의 고유한 설정을 관리합니다</p>
          </div>
          <Button onClick={handleAddNew} disabled={!!editingCenter}>
            <Plus className="w-4 h-4 mr-2" />
            새 센터 추가
          </Button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* 편집 폼 */}
        {editingCenter && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                {isAddingNew ? "새 센터 추가" : "센터 설정 편집"}
              </h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="w-4 h-4 mr-1" />
                  취소
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 센터명 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  센터명 *
                </label>
                <Input
                  value={editingCenter.center_name}
                  onChange={(e) => handleInputChange('center_name', e.target.value)}
                  placeholder="예: 강남점, 홍대점"
                  required
                />
              </div>

              {/* 카카오봇 ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카카오봇 ID *
                </label>
                <div className="relative">
                  <Bot className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    value={editingCenter.kakao_bot_id}
                    onChange={(e) => handleInputChange('kakao_bot_id', e.target.value)}
                    placeholder="예: _xcLqxjb"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* 카카오 채널 ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카카오 채널 ID
                </label>
                <Input
                  value={editingCenter.kakao_channel_id || ""}
                  onChange={(e) => handleInputChange('kakao_channel_id', e.target.value)}
                  placeholder="선택사항"
                />
              </div>

              {/* 전화번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  전화번호
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    value={editingCenter.center_phone || ""}
                    onChange={(e) => handleInputChange('center_phone', e.target.value)}
                    placeholder="예: 02-1234-5678"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="email"
                    value={editingCenter.center_email || ""}
                    onChange={(e) => handleInputChange('center_email', e.target.value)}
                    placeholder="예: contact@center.com"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 주소 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  주소
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                  <Input
                    value={editingCenter.center_address || ""}
                    onChange={(e) => handleInputChange('center_address', e.target.value)}
                    placeholder="예: 서울시 강남구 테헤란로 123"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 활성화 상태 */}
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingCenter.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">센터 활성화</span>
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* 센터 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {centers.map((center) => (
            <Card key={center.id} className="p-4 hover:shadow-md transition-shadow">
                             <div className="flex items-start justify-between mb-3">
                 <div className="flex items-center">
                   <Building2 className="w-5 h-5 text-blue-600 mr-2" />
                   <h3 className="font-medium text-gray-900">{center.center_name}</h3>
                 </div>
                 <div className="flex gap-1">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleEdit(center)}
                     disabled={!!editingCenter || deleting === center.id}
                   >
                     <Edit className="w-4 h-4" />
                   </Button>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleDelete(center.id, center.center_name)}
                     disabled={!!editingCenter || deleting === center.id}
                     className="text-red-600 hover:text-red-700 hover:bg-red-50"
                   >
                     {deleting === center.id ? (
                       <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                     ) : (
                       <Trash2 className="w-4 h-4" />
                     )}
                   </Button>
                 </div>
               </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Bot className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="font-mono">{center.kakao_bot_id}</span>
                </div>
                
                {center.center_phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{center.center_phone}</span>
                  </div>
                )}
                
                {center.center_email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{center.center_email}</span>
                  </div>
                )}
                
                {center.center_address && (
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                    <span className="text-xs">{center.center_address}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  center.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {center.is_active ? '활성' : '비활성'}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* 빈 상태 */}
        {centers.length === 0 && !editingCenter && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 센터가 없습니다</h3>
            <p className="text-gray-600 mb-4">새 센터를 추가하여 시작하세요.</p>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              첫 번째 센터 추가
            </Button>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
