import { supabase } from './supabaseClient';

export interface MembershipHistory {
  id: string;
  member_id: string;
  membership_type: string;
  start_date: string;
  end_date: string | null;
  total_sessions: number | null;
  used_sessions: number | null;
  remaining_sessions: number | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MembershipInfo {
  membership_status: string;
  remaining_sessions: number;
  expires_at: string | null;
  membership_type: string | null;
  start_date: string | null;
  total_sessions: number | null;
  used_sessions: number | null;
}

export interface MemberWithMembership {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  registered_at: string | null;
  last_visit_at: string | null;
  points: number | null;
  memo: string | null;
  kakao_id: string | null;
  kakao_user_id: string | null;
  is_temp: boolean | null;
  // 회원권 정보 (membership_history에서 조회)
  membership_status: string;
  remaining_sessions: number;
  expires_at: string | null;
  membership_type: string | null;
  start_date: string | null;
  total_sessions: number | null;
  used_sessions: number | null;
}

/**
 * 특정 회원의 최신 회원권 정보 조회
 */
export async function getLatestMembershipInfo(memberId: string): Promise<MembershipInfo | null> {
  try {
    const { data, error } = await supabase
      .from('membership_history')
      .select(`
        status,
        remaining_sessions,
        end_date,
        membership_type,
        start_date,
        total_sessions,
        used_sessions
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('회원권 정보 조회 오류:', error);
      return null;
    }

    if (!data) {
      return {
        membership_status: '미등록',
        remaining_sessions: 0,
        expires_at: null,
        membership_type: null,
        start_date: null,
        total_sessions: null,
        used_sessions: null
      };
    }

    // 회원권 상태를 자동으로 계산
    const calculatedStatus = calculateMembershipStatus(
      data.end_date as string | null, 
      (data.remaining_sessions as number) || 0
    );

    return {
      membership_status: calculatedStatus,
      remaining_sessions: (data.remaining_sessions as number) || 0,
      expires_at: data.end_date as string | null,
      membership_type: data.membership_type as string | null,
      start_date: data.start_date as string | null,
      total_sessions: (data.total_sessions as number) || 0,
      used_sessions: (data.used_sessions as number) || 0
    };
  } catch (error) {
    console.error('회원권 정보 조회 중 오류:', error);
    return null;
  }
}

/**
 * 모든 회원의 기본 정보와 최신 회원권 정보를 함께 조회
 */
export async function getAllMembersWithMembership(): Promise<MemberWithMembership[]> {
  try {
    // 1. 모든 회원 기본 정보 조회
    const { data: members, error: membersError } = await supabase
      .from('member')
      .select(`
        id,
        name,
        gender,
        age,
        phone,
        registered_at,
        last_visit_at,
        points,
        memo,
        kakao_id,
        kakao_user_id,
        is_temp
      `)
      .order('name', { ascending: true });

    if (membersError) {
      throw membersError;
    }

    if (!members) {
      return [];
    }

    // 2. 각 회원의 최신 회원권 정보 조회
    const membersWithMembership = await Promise.all(
      members.map(async (member) => {
        const membershipInfo = await getLatestMembershipInfo(member.id as string);
        
        return {
          ...member,
          membership_status: membershipInfo?.membership_status || '미등록',
          remaining_sessions: membershipInfo?.remaining_sessions || 0,
          expires_at: membershipInfo?.expires_at,
          membership_type: membershipInfo?.membership_type,
          start_date: membershipInfo?.start_date,
          total_sessions: membershipInfo?.total_sessions || 0,
          used_sessions: membershipInfo?.used_sessions || 0
        };
      })
    );

    return membersWithMembership as unknown as MemberWithMembership[];
  } catch (error) {
    console.error('회원 정보 조회 중 오류:', error);
    throw error;
  }
}

/**
 * 회원권 상태 자동 계산 (만료일과 잔여횟수 기반)
 */
export function calculateMembershipStatus(expiresAt: string | null, remainingSessions: number): string {
  // 회원권이 등록되지 않은 경우 (만료일이 없고 잔여횟수가 0)
  if (!expiresAt && remainingSessions === 0) {
    return '미등록';
  }
  
  // 만료일이 없지만 잔여횟수가 있는 경우
  if (!expiresAt) {
    return remainingSessions > 0 ? '활성' : '미입력';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정하여 날짜만 비교
  const expiryDate = new Date(expiresAt);
  expiryDate.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정하여 날짜만 비교

  // 만료일이 지났거나 잔여횟수가 0이면 '만료'
  if (expiryDate < today || remainingSessions <= 0) {
    return '만료';
  }
  
  // 잔여횟수가 있고 만료일이 지나지 않았으면 '활성'
  if (remainingSessions > 0 && expiryDate >= today) {
    return '활성';
  }
  
  return '미입력';
}
