'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DebugKakaoMapping() {
  const [mappingStats, setMappingStats] = useState<any>(null);
  const [mappedMembers, setMappedMembers] = useState<any[]>([]);
  const [unmappedMembers, setUnmappedMembers] = useState<any[]>([]);
  const [reservationStats, setReservationStats] = useState<any>(null);
  const [mappingDetails, setMappingDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMappingData();
  }, []);

  const fetchMappingData = async () => {
    try {
      setLoading(true);

      // 1. 전체 매핑 통계
      const statsData = await supabase
        .from('member')
        .select('kakao_user_id')
        .then(result => {
          const total = result.data?.length || 0;
          const mapped = result.data?.filter(m => m.kakao_user_id).length || 0;
          return {
            total_members: total,
            mapped_members: mapped,
            unmapped_members: total - mapped,
            mapping_percentage: total > 0 ? Math.round((mapped / total) * 100 * 100) / 100 : 0
          };
        });

      setMappingStats(statsData);

      // 2. 매핑된 회원 목록
      const { data: mappedData } = await supabase
        .from('member')
        .select('id, name, phone, kakao_user_id, membership_status, created_at')
        .not('kakao_user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      setMappedMembers(mappedData || []);

      // 3. 매핑되지 않은 회원 목록
      const { data: unmappedData } = await supabase
        .from('member')
        .select('id, name, phone, membership_status, created_at')
        .is('kakao_user_id', null)
        .order('created_at', { ascending: false })
        .limit(10);

      setUnmappedMembers(unmappedData || []);

      // 4. 예약 통계
      const reservationData = await supabase
        .from('reservation')
        .select('uid')
        .then(result => {
          const total = result.data?.length || 0;
          const withKakaoId = result.data?.filter(r => r.uid).length || 0;
          return {
            total_reservations: total,
            reservations_with_kakao_id: withKakaoId,
            reservations_without_kakao_id: total - withKakaoId
          };
        });

      setReservationStats(reservationData);

      // 5. 매핑 상세 정보
      const { data: detailsData } = await supabase
        .from('reservation')
        .select(`
          id,
          name,
          phone,
          uid,
          created_at,
          member:member!inner(
            id,
            name,
            phone,
            kakao_user_id
          )
        `)
        .not('uid', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      setMappingDetails(detailsData || []);

    } catch (error) {
      console.error('매핑 데이터 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const testKakaoMapping = async () => {
    const testKakaoId = 'test_kakao_user_123';
    const testName = '테스트회원';
    const testPhone = '010-1234-5678';

    try {
      // 테스트 회원 생성
      const { data: memberData, error: memberError } = await supabase
        .from('member')
        .insert({
          name: testName,
          phone: testPhone,
          membership_status: '활성',
          kakao_user_id: testKakaoId
        })
        .select()
        .single();

      if (memberError) {
        console.error('테스트 회원 생성 오류:', memberError);
        alert('테스트 회원 생성 실패');
        return;
      }

      alert(`테스트 회원 생성 성공!\nID: ${memberData.id}\nKakao ID: ${memberData.kakao_user_id}`);
      
      // 데이터 새로고침
      fetchMappingData();

    } catch (error) {
      console.error('테스트 오류:', error);
      alert('테스트 실패');
    }
  };

  if (loading) {
    return <div className="p-8">로딩 중...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">카카오 사용자 ID 매핑 디버그</h1>

      {/* 매핑 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600">전체 회원</div>
          <div className="text-2xl font-bold">{mappingStats?.total_members || 0}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600">매핑된 회원</div>
          <div className="text-2xl font-bold">{mappingStats?.mapped_members || 0}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-red-600">미매핑 회원</div>
          <div className="text-2xl font-bold">{mappingStats?.unmapped_members || 0}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-purple-600">매핑률</div>
          <div className="text-2xl font-bold">{mappingStats?.mapping_percentage || 0}%</div>
        </div>
      </div>

      {/* 예약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">전체 예약</div>
          <div className="text-2xl font-bold">{reservationStats?.total_reservations || 0}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600">카카오 ID 있음</div>
          <div className="text-2xl font-bold">{reservationStats?.reservations_with_kakao_id || 0}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-red-600">카카오 ID 없음</div>
          <div className="text-2xl font-bold">{reservationStats?.reservations_without_kakao_id || 0}</div>
        </div>
      </div>

      {/* 테스트 버튼 */}
      <div>
        <button
          onClick={testKakaoMapping}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          테스트 매핑 실행
        </button>
      </div>

      {/* 매핑된 회원 목록 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">매핑된 회원 (최근 10개)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">이름</th>
                <th className="px-4 py-2 text-left">전화번호</th>
                <th className="px-4 py-2 text-left">카카오 ID</th>
                <th className="px-4 py-2 text-left">상태</th>
                <th className="px-4 py-2 text-left">등록일</th>
              </tr>
            </thead>
            <tbody>
              {mappedMembers.map((member) => (
                <tr key={member.id} className="border-t">
                  <td className="px-4 py-2">{member.name}</td>
                  <td className="px-4 py-2">{member.phone}</td>
                  <td className="px-4 py-2 font-mono text-sm">{member.kakao_user_id}</td>
                  <td className="px-4 py-2">{member.membership_status}</td>
                  <td className="px-4 py-2">{new Date(member.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 매핑되지 않은 회원 목록 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">매핑되지 않은 회원 (최근 10개)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">이름</th>
                <th className="px-4 py-2 text-left">전화번호</th>
                <th className="px-4 py-2 text-left">상태</th>
                <th className="px-4 py-2 text-left">등록일</th>
              </tr>
            </thead>
            <tbody>
              {unmappedMembers.map((member) => (
                <tr key={member.id} className="border-t">
                  <td className="px-4 py-2">{member.name}</td>
                  <td className="px-4 py-2">{member.phone}</td>
                  <td className="px-4 py-2">{member.membership_status}</td>
                  <td className="px-4 py-2">{new Date(member.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 매핑 상세 정보 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">예약 매핑 상세 (최근 20개)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">예약자</th>
                <th className="px-4 py-2 text-left">카카오 ID</th>
                <th className="px-4 py-2 text-left">회원 매핑</th>
                <th className="px-4 py-2 text-left">예약일</th>
              </tr>
            </thead>
            <tbody>
              {mappingDetails.map((detail) => (
                <tr key={detail.id} className="border-t">
                  <td className="px-4 py-2">{detail.name}</td>
                  <td className="px-4 py-2 font-mono text-sm">{detail.uid}</td>
                  <td className="px-4 py-2">
                    {detail.member ? (
                      <span className="text-green-600">✅ 매핑됨</span>
                    ) : (
                      <span className="text-red-600">❌ 미매핑</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{new Date(detail.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
