'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { SidebarLayout } from '@/components/dashboard/SidebarLayout';
import { getAllActiveCenters, upsertCenterConfig } from '@/lib/centerConfig';
import type { CenterConfig } from '@/types/center-config';

export default function CenterManagementPage() {
  const [centers, setCenters] = useState<CenterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    center_name: '',
    kakao_bot_id: '',
    kakao_channel_id: '',
    center_address: '',
    center_phone: '',
    center_email: ''
  });

  // 센터 목록 불러오기
  const fetchCenters = async () => {
    try {
      setLoading(true);
      const data = await getAllActiveCenters();
      setCenters(data);
      setError(null);
    } catch (err) {
      setError('센터 목록을 불러오는데 실패했습니다.');
      console.error('센터 목록 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      center_name: '',
      kakao_bot_id: '',
      kakao_channel_id: '',
      center_address: '',
      center_phone: '',
      center_email: ''
    });
    setShowCreate(false);
    setEditingId(null);
  };

  // 센터 추가/수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.center_name || !formData.kakao_bot_id) {
      alert('센터명과 카카오봇 ID는 필수입니다.');
      return;
    }

    try {
      const configData = {
        ...formData,
        ...(editingId && { id: editingId })
      };

      await upsertCenterConfig(configData);
      await fetchCenters();
      resetForm();
      alert(editingId ? '센터가 수정되었습니다.' : '센터가 추가되었습니다.');
    } catch (err) {
      console.error('센터 저장 오류:', err);
      alert('센터 저장에 실패했습니다.');
    }
  };

  // 수정 모드 시작
  const handleEdit = (center: CenterConfig) => {
    setFormData({
      center_name: center.center_name,
      kakao_bot_id: center.kakao_bot_id,
      kakao_channel_id: center.kakao_channel_id || '',
      center_address: center.center_address || '',
      center_phone: center.center_phone || '',
      center_email: center.center_email || ''
    });
    setEditingId(center.id);
    setShowCreate(true);
  };

  return (
    <SidebarLayout>
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">센터 관리</h1>
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            센터 추가
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* 센터 추가/수정 폼 */}
        {showCreate && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {editingId ? '센터 수정' : '센터 추가'}
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="center_name">센터명 *</Label>
                    <Input
                      id="center_name"
                      value={formData.center_name}
                      onChange={(e) => setFormData({ ...formData, center_name: e.target.value })}
                      placeholder="예: SnapPilates 강남점"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="kakao_bot_id">카카오봇 ID *</Label>
                    <Input
                      id="kakao_bot_id"
                      value={formData.kakao_bot_id}
                      onChange={(e) => setFormData({ ...formData, kakao_bot_id: e.target.value })}
                      placeholder="예: _xkzxiNn"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="kakao_channel_id">카카오채널 ID</Label>
                    <Input
                      id="kakao_channel_id"
                      value={formData.kakao_channel_id}
                      onChange={(e) => setFormData({ ...formData, kakao_channel_id: e.target.value })}
                      placeholder="예: _ZeUTxl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="center_phone">전화번호</Label>
                    <Input
                      id="center_phone"
                      value={formData.center_phone}
                      onChange={(e) => setFormData({ ...formData, center_phone: e.target.value })}
                      placeholder="예: 02-1234-5678"
                    />
                  </div>
                  <div>
                    <Label htmlFor="center_email">이메일</Label>
                    <Input
                      id="center_email"
                      type="email"
                      value={formData.center_email}
                      onChange={(e) => setFormData({ ...formData, center_email: e.target.value })}
                      placeholder="예: gangnam@snappilates.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="center_address">주소</Label>
                    <Input
                      id="center_address"
                      value={formData.center_address}
                      onChange={(e) => setFormData({ ...formData, center_address: e.target.value })}
                      placeholder="예: 서울시 강남구 테헤란로 123"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    취소
                  </Button>
                  <Button type="submit" className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {editingId ? '수정' : '추가'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 센터 목록 */}
        {loading ? (
          <div className="text-center py-8">불러오는 중...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {centers.map((center) => (
              <Card key={center.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{center.center_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(center)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">카카오봇 ID:</span>
                    <p className="text-sm">{center.kakao_bot_id}</p>
                  </div>
                  {center.kakao_channel_id && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">카카오채널 ID:</span>
                      <p className="text-sm">{center.kakao_channel_id}</p>
                    </div>
                  )}
                  {center.center_phone && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">전화번호:</span>
                      <p className="text-sm">{center.center_phone}</p>
                    </div>
                  )}
                  {center.center_email && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">이메일:</span>
                      <p className="text-sm">{center.center_email}</p>
                    </div>
                  )}
                  {center.center_address && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">주소:</span>
                      <p className="text-sm">{center.center_address}</p>
                    </div>
                  )}
                  <div className="pt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      활성
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && centers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            등록된 센터가 없습니다. 센터를 추가해주세요.
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
