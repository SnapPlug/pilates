"use client";
import React, { useState, useEffect } from "react";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import { SettingsSection } from "@/components/ui/settings-section";
import { SettingsItem } from "@/components/ui/settings-item";
import { Toggle } from "@/components/ui/toggle";
import { 
  Bell, 
  Shield, 
  User, 
  Settings, 
  Palette, 
  Upload, 
  Globe,
  BookOpen,
  Calendar,
  Download,
  Trash2,
  Info
} from 'lucide-react';
import { createLogContext, logDebug, logError } from "@/lib/logger";
import type { SystemSettings } from "@/app/api/settings/route";

/**
 * 시스템 설정 페이지
 * 아이폰 설정화면처럼 토글로 on/off를 할 수 있는 다양한 설정들을 관리합니다.
 */
export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 시스템 설정
  const [settings, setSettings] = useState<SystemSettings>({
    showInstructorName: true,
    showClassName: true,
    calendarView: '1주',
    weeklyRecommendedSessions: 2,
    membershipExpirationBuffer: 3,
    remainingSessionsThreshold: 3
  });

  useEffect(() => {
    // 설정 로드
    loadSettings();
  }, []);

  // 설정 로드
  const loadSettings = async () => {
    const logCtx = createLogContext('SettingsPage', 'loadSettings');
    logDebug(logCtx, '설정 로드 시작');
    
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (response.ok) {
        setSettings(data);
        logDebug({ ...logCtx, state: 'success' }, '설정 로드 완료', data);
      } else {
        throw new Error(data.error || '설정을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      const error = err as Error;
      logError({ ...logCtx, error, state: 'error' });
      setError("설정을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 설정 변경 핸들러
  const handleSettingChange = async (key: keyof SystemSettings, value: boolean | string | number) => {
    const logCtx = createLogContext('SettingsPage', 'handleSettingChange');
    logDebug(logCtx, '설정 변경 시작', { key, value });
    
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      
      // API로 설정 저장
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        logDebug({ ...logCtx, state: 'success' }, '설정 저장 완료', result);
      } else {
        throw new Error(result.error || '설정을 저장하는데 실패했습니다.');
      }
    } catch (err) {
      const error = err as Error;
      logError({ ...logCtx, error, state: 'error' });
      setError("설정을 저장하는데 실패했습니다.");
      // 원래 값으로 되돌리기
      setSettings(prev => ({ ...prev }));
    }
  };

  // 데이터 내보내기
  const handleExportData = () => {
    logDebug(createLogContext('SettingsPage', 'handleExportData'), '데이터 내보내기 시작');
    // 실제 구현에서는 데이터 내보내기 로직
    alert('데이터 내보내기 기능이 준비 중입니다.');
  };

  // 데이터 가져오기
  const handleImportData = () => {
    logDebug(createLogContext('SettingsPage', 'handleImportData'), '데이터 가져오기 시작');
    // 실제 구현에서는 파일 선택 및 데이터 가져오기 로직
    alert('데이터 가져오기 기능이 준비 중입니다.');
  };

  // 모든 데이터 삭제
  const handleDeleteAllData = () => {
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      logDebug(createLogContext('SettingsPage', 'handleDeleteAllData'), '모든 데이터 삭제 시작');
      // 실제 구현에서는 데이터 삭제 로직
      alert('데이터 삭제 기능이 준비 중입니다.');
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">설정을 불러오는 중...</div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">설정</h1>
          <p className="text-gray-600 mt-2">시스템의 모든 설정을 관리합니다</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* 수업 정보 설정 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SettingsSection title="예약 관리">
            <div className="grid grid-cols-1 gap-0">
              <SettingsItem
                title="강사명"
                subtitle="예약시 강사명을 노출합니다."
                icon={<User className="w-5 h-5" />}
                rightElement={
                  <Toggle
                    checked={settings.showInstructorName}
                    onCheckedChange={(value) => handleSettingChange('showInstructorName', value)}
                  />
                }
              />
              
              <SettingsItem
                title="수업명"
                subtitle="예약시 수업명을 노출합니다."
                icon={<BookOpen className="w-5 h-5" />}
                rightElement={
                  <Toggle
                    checked={settings.showClassName}
                    onCheckedChange={(value) => handleSettingChange('showClassName', value)}
                  />
                }
              />
                          <SettingsItem
                title="달력 보기 설정"
                subtitle="노출할 기간을 설정합니다."
                icon={<Calendar className="w-5 h-5" />}
                rightElement={
                  <select
                    value={settings.calendarView}
                    onChange={(e) => handleSettingChange('calendarView', e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1주">1주</option>
                    <option value="2주">2주</option>
                    <option value="1달">1달</option>
                  </select>
                }
              />
            </div>
          </SettingsSection>

          {/* 회원권 정보 설정 */}
          <SettingsSection title="회원권 정보">
            <div className="grid grid-cols-1 gap-0">
                 <SettingsItem
                title="1주간 권장 횟수"
                subtitle="1주간 수강 권장 횟수를 설정합니다."
                icon={<Globe className="w-5 h-5" />}
                rightElement={
                  <select
                    value={settings.weeklyRecommendedSessions}
                    onChange={(e) => handleSettingChange('weeklyRecommendedSessions', Number(e.target.value))}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">1회</option>
                    <option value="2">2회</option>
                    <option value="3">3회</option>
                    <option value="4">4회</option>
                  </select>
                }
              />
          

              <SettingsItem
                title="회원권 잔여 기간 관리"
                subtitle="회원권 만료 전 알림을 보낼 기간을 설정합니다."
                icon={<Globe className="w-5 h-5" />}
                rightElement={
                  <select
                    value={settings.membershipExpirationBuffer}
                    onChange={(e) => handleSettingChange('membershipExpirationBuffer', Number(e.target.value))}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="3">3일</option>
                    <option value="7">7일</option>
                    <option value="14">14일</option>
                  </select>
                }
              />

              <SettingsItem
                title="잔여 횟수 관리"
                subtitle="설정한 잔여 횟수에 따라 필터링된 회원을 관리합니다."
                icon={<Globe className="w-5 h-5" />}
                rightElement={
                  <select
                    value={settings.remainingSessionsThreshold}
                    onChange={(e) => handleSettingChange('remainingSessionsThreshold', Number(e.target.value))}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="3">3회</option>
                    <option value="5">5회</option>
                    <option value="7">7회</option>
                  </select>
                }
              />
            </div>
          </SettingsSection>
        </div>

        {/* 데이터 내보내기/가져오기 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SettingsSection title="데이터 백업 및 복원">
            <div className="grid grid-cols-1 gap-0">
              <SettingsItem
                title="데이터 내보내기"
                subtitle="모든 데이터를 파일로 내보냅니다"
                icon={<Download className="w-5 h-5" />}
                onPress={handleExportData}
                showChevron
              />
              
              <SettingsItem
                title="데이터 가져오기"
                subtitle="백업 파일에서 데이터를 복원합니다"
                icon={<Upload className="w-5 h-5" />}
                onPress={handleImportData}
                showChevron
              />
              
              <SettingsItem
                title="모든 데이터 삭제"
                subtitle="시스템의 모든 데이터를 영구적으로 삭제합니다"
                icon={<Trash2 className="w-5 h-5" />}
                onPress={handleDeleteAllData}
                showChevron
                className="border-t border-gray-200"
              />
            </div>
          </SettingsSection>

          {/* 정보 */}
          <SettingsSection title="정보">
            <div className="grid grid-cols-1 gap-0">
              <SettingsItem
                title="버전"
                subtitle="현재 설치된 시스템의 버전 정보"
                icon={<Info className="w-5 h-5" />}
                rightElement={<span className="text-sm text-gray-500">1.0.0</span>}
              />
             
              
              <SettingsItem
                title="개인정보 처리방침"
                subtitle="개인정보 수집 및 이용에 대한 안내"
                icon={<Info className="w-5 h-5" />}
                onPress={() => window.open('/privacy', '_blank')}
                showExternalLink
              />
              
              <SettingsItem
                title="이용약관"
                subtitle="서비스 이용에 대한 약관"
                icon={<Info className="w-5 h-5" />}
                onPress={() => window.open('/terms', '_blank')}
                showExternalLink
              />
            </div>
          </SettingsSection>
        </div>

        
      </div>
    </SidebarLayout>
  );
}
