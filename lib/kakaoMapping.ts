import { supabaseClient } from './supabaseClient';
import type { KakaoUserMapping, MemberWithKakaoMapping } from '../types/kakao-mapping';

/**
 * 회원의 카카오 매핑 상태를 확인합니다
 */
export async function getMemberKakaoMapping(memberId: string): Promise<KakaoUserMapping | null> {
  try {
    const { data, error } = await supabaseClient
      .from('kakao_user_mapping')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('카카오 매핑 조회 오류:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('카카오 매핑 조회 실패:', error);
    throw error;
  }
}

/**
 * 카카오 사용자 ID로 회원을 찾습니다
 */
export async function getMemberByKakaoUserId(kakaoUserId: string): Promise<MemberWithKakaoMapping | null> {
  try {
    const { data, error } = await supabaseClient
      .from('member')
      .select(`
        id,
        name,
        phone,
        kakao_user_id,
        kakao_user_mapping!inner(
          mapping_status,
          verification_code,
          verification_expires_at
        )
      `)
      .eq('kakao_user_id', kakaoUserId)
      .eq('kakao_user_mapping.mapping_status', 'verified')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('카카오 사용자로 회원 조회 오류:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      kakao_user_id: data.kakao_user_id,
      mapping_status: data.kakao_user_mapping[0]?.mapping_status,
      verification_code: data.kakao_user_mapping[0]?.verification_code,
      verification_expires_at: data.kakao_user_mapping[0]?.verification_expires_at
    };
  } catch (error) {
    console.error('카카오 사용자로 회원 조회 실패:', error);
    throw error;
  }
}

/**
 * 새로운 카카오 매핑을 생성합니다 (인증 코드 포함)
 */
export async function createKakaoMapping(memberId: string): Promise<{ mappingId: string; verificationCode: string }> {
  try {
    const { data, error } = await supabaseClient
      .rpc('create_kakao_mapping', { member_uuid: memberId });

    if (error) {
      console.error('카카오 매핑 생성 오류:', error);
      throw error;
    }

    return {
      mappingId: data[0].mapping_id,
      verificationCode: data[0].verification_code
    };
  } catch (error) {
    console.error('카카오 매핑 생성 실패:', error);
    throw error;
  }
}

/**
 * 카카오 사용자 ID로 매핑을 완료합니다
 */
export async function completeKakaoMapping(
  memberId: string, 
  kakaoUserId: string, 
  verificationCode: string
): Promise<boolean> {
  try {
    // 인증 코드 확인
    const { data: mapping, error: mappingError } = await supabaseClient
      .from('kakao_user_mapping')
      .select('*')
      .eq('member_id', memberId)
      .eq('verification_code', verificationCode)
      .eq('mapping_status', 'pending')
      .gte('verification_expires_at', new Date().toISOString())
      .single();

    if (mappingError || !mapping) {
      console.error('인증 코드 확인 실패:', mappingError);
      return false;
    }

    // 매핑 완료
    const { error: updateError } = await supabaseClient
      .from('kakao_user_mapping')
      .update({
        kakao_user_id: kakaoUserId,
        mapping_status: 'verified',
        verified_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .eq('id', mapping.id);

    if (updateError) {
      console.error('매핑 완료 오류:', updateError);
      throw updateError;
    }

    return true;
  } catch (error) {
    console.error('카카오 매핑 완료 실패:', error);
    throw error;
  }
}

/**
 * 만료된 매핑을 정리합니다
 */
export async function cleanupExpiredMappings(): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('kakao_user_mapping')
      .update({ mapping_status: 'expired' })
      .eq('mapping_status', 'pending')
      .lt('verification_expires_at', new Date().toISOString());

    if (error) {
      console.error('만료된 매핑 정리 오류:', error);
      throw error;
    }
  } catch (error) {
    console.error('만료된 매핑 정리 실패:', error);
    throw error;
  }
}

/**
 * 회원의 매핑 상태를 확인합니다
 */
export async function getMemberMappingStatus(memberId: string): Promise<{
  isMapped: boolean;
  kakaoUserId?: string;
  mappingStatus?: string;
}> {
  try {
    const mapping = await getMemberKakaoMapping(memberId);
    
    if (!mapping) {
      return { isMapped: false };
    }

    return {
      isMapped: mapping.mapping_status === 'verified',
      kakaoUserId: mapping.kakao_user_id,
      mappingStatus: mapping.mapping_status
    };
  } catch (error) {
    console.error('매핑 상태 확인 실패:', error);
    return { isMapped: false };
  }
}
