"use client";
import React, { useState, useEffect } from "react";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Calendar, TrendingUp, Phone, Mail, MapPin, Bot } from "lucide-react";
import { getAllCentersStats, getAllActiveCenters } from "@/lib/centerConfig";
import type { CenterConfig } from "@/types/center-config";

type CenterStats = {
  centerName: string;
  totalClasses: number;
  totalMembers: number;
  totalReservations: number;
  attendedReservations: number;
  attendanceRate: number;
  dateRange?: { start: string; end: string };
};

/**
 * 센터별 통계 관리 페이지
 * 각 센터의 수업, 회원, 예약 통계를 확인할 수 있습니다.
 */
export default function CenterManagementPage() {
  const [centers, setCenters] = useState<CenterConfig[]>([]);
  const [stats, setStats] = useState<CenterStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);

  // 페이지 로드 시 데이터 조회
  useEffect(() => {
    loadData();
  }, [selectedPeriod, customDateRange]);

  /**
   * 센터 목록과 통계 데이터를 불러옵니다
   */
  const loadData = async () => {
    const debugId = crypto.randomUUID();
    console.log(`[DEBUG][debugId=${debugId}] [CenterManagementPage#loadData] state=mounted, period=${selectedPeriod}`);
    
    setLoading(true);
    setError(null);
    
    try {
      // 날짜 범위 계산
      const dateRange = getDateRange();
      
      // 센터 목록과 통계 데이터 병렬 조회
      const [centersData, statsData] = await Promise.all([
        getAllActiveCenters(),
        getAllCentersStats(dateRange)
      ]);
      
      console.log(`[DEBUG][debugId=${debugId}] [CenterManagementPage#loadData] state=success, centers=${centersData.length}, stats=${statsData.length}`);
      
      setCenters(centersData);
      setStats(statsData);
    } catch (err) {
      const error = err as Error;
      console.error(`[ERROR][debugId=${debugId}] [CenterManagementPage#loadData] message="${error.message}"`, error);
      setError("데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 선택된 기간에 따른 날짜 범위를 계산합니다
   */
  const getDateRange = (): { start: string; end: string } | undefined => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return {
          start: weekStart.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: monthStart.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        };
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return {
          start: quarterStart.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        };
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return {
          start: yearStart.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        };
      case 'custom':
        return customDateRange || undefined;
      default:
        return undefined;
    }
  };

  /**
   * 전체 통계를 계산합니다
   */
  const getTotalStats = () => {
    return stats.reduce((acc, stat) => ({
      totalClasses: acc.totalClasses + stat.totalClasses,
      totalMembers: acc.totalMembers + stat.totalMembers,
      totalReservations: acc.totalReservations + stat.totalReservations,
      attendedReservations: acc.attendedReservations + stat.attendedReservations,
    }), {
      totalClasses: 0,
      totalMembers: 0,
      totalReservations: 0,
      attendedReservations: 0,
    });
  };

  const totalStats = getTotalStats();
  const overallAttendanceRate = totalStats.totalReservations > 0 
    ? Math.round((totalStats.attendedReservations / totalStats.totalReservations) * 1000) / 10 
    : 0;

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">센터 통계를 불러오는 중...</div>
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
            <h1 className="text-2xl font-semibold">센터 관리</h1>
            <p className="text-gray-600 mt-1">각 센터의 통계와 현황을 확인합니다</p>
          </div>
          
          {/* 기간 선택 */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="week">이번 주</option>
              <option value="month">이번 달</option>
              <option value="quarter">이번 분기</option>
              <option value="year">올해</option>
              <option value="custom">사용자 지정</option>
            </select>
            
            {selectedPeriod === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customDateRange?.start || ''}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev!, start: e.target.value }))}
                  className="border rounded-md px-2 py-1 text-sm"
                />
                <span className="text-gray-500">~</span>
                <input
                  type="date"
                  value={customDateRange?.end || ''}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev!, end: e.target.value }))}
                  className="border rounded-md px-2 py-1 text-sm"
                />
              </div>
            )}
            
            <Button onClick={loadData} disabled={loading}>
              새로고침
            </Button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* 전체 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="총 센터 수"
            value={centers.length}
            icon={<Building2 className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="총 수업 수"
            value={totalStats.totalClasses}
            icon={<Calendar className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            title="총 회원 수"
            value={totalStats.totalMembers}
            icon={<Users className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            title="평균 출석률"
            value={`${overallAttendanceRate}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            color="orange"
          />
        </div>

        {/* 센터별 상세 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {centers.map((center) => {
            const centerStats = stats.find(s => s.centerName === center.center_name);
            
            return (
              <Card key={center.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <Building2 className="w-6 h-6 text-blue-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{center.center_name}</h3>
                      <p className="text-sm text-gray-500">센터 정보</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    center.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {center.is_active ? '활성' : '비활성'}
                  </span>
                </div>

                {/* 센터 정보 */}
                <div className="space-y-2 mb-4 text-sm text-gray-600">
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
                  <div className="flex items-center">
                    <Bot className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-mono text-xs">{center.kakao_bot_id}</span>
                  </div>
                </div>

                {/* 통계 정보 */}
                {centerStats ? (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{centerStats.totalClasses}</div>
                      <div className="text-xs text-gray-500">수업 수</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{centerStats.totalMembers}</div>
                      <div className="text-xs text-gray-500">회원 수</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{centerStats.totalReservations}</div>
                      <div className="text-xs text-gray-500">예약 수</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{centerStats.attendanceRate}%</div>
                      <div className="text-xs text-gray-500">출석률</div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t text-center text-gray-500 text-sm">
                    통계 데이터가 없습니다
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* 빈 상태 */}
        {centers.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 센터가 없습니다</h3>
            <p className="text-gray-600 mb-4">설정 페이지에서 센터를 추가해주세요.</p>
            <Button onClick={() => window.location.href = '/settings'}>
              설정 페이지로 이동
            </Button>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

type StatCardProps = {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
};

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
