import { supabaseClient } from './supabaseClient';
import type { CenterConfig, CenterConfigRow } from '../types/center-config';

/**
 * 모든 활성 센터 설정을 가져옵니다
 */
export async function getAllActiveCenters(): Promise<CenterConfig[]> {
  try {
    const { data, error } = await supabaseClient
      .from('center_config')
      .select('*')
      .eq('is_active', true)
      .order('center_name');

    if (error) {
      console.error('센터 설정 조회 오류:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('센터 설정 조회 실패:', error);
    throw error;
  }
}

/**
 * 특정 센터의 설정을 가져옵니다
 */
export async function getCenterConfig(centerName: string): Promise<CenterConfig | null> {
  try {
    const { data, error } = await supabaseClient
      .from('center_config')
      .select('*')
      .eq('center_name', centerName)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 데이터가 없는 경우
        return null;
      }
      console.error('센터 설정 조회 오류:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('센터 설정 조회 실패:', error);
    throw error;
  }
}

/**
 * 센터 ID로 설정을 가져옵니다
 */
export async function getCenterConfigById(centerId: string): Promise<CenterConfig | null> {
  try {
    const { data, error } = await supabaseClient
      .from('center_config')
      .select('*')
      .eq('id', centerId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('센터 설정 조회 오류:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('센터 설정 조회 실패:', error);
    throw error;
  }
}

/**
 * 기본 센터의 카카오봇 ID를 가져옵니다 (fallback용)
 */
export async function getDefaultKakaoBotId(): Promise<string> {
  try {
    // 첫 번째 활성 센터를 기본값으로 사용
    const { data, error } = await supabaseClient
      .from('center_config')
      .select('kakao_bot_id')
      .eq('is_active', true)
      .order('center_name')
      .limit(1)
      .single();

    if (error) {
      console.error('기본 카카오봇 ID 조회 오류:', error);
      // 환경변수 fallback
      return process.env.NEXT_PUBLIC_KAKAO_BOT_ID || 'YOUR_BOT_ID';
    }

    return data?.kakao_bot_id || process.env.NEXT_PUBLIC_KAKAO_BOT_ID || 'YOUR_BOT_ID';
  } catch (error) {
    console.error('기본 카카오봇 ID 조회 실패:', error);
    return process.env.NEXT_PUBLIC_KAKAO_BOT_ID || 'YOUR_BOT_ID';
  }
}

/**
 * 센터별 카카오챗봇 링크를 생성합니다
 */
export async function generateCenterKakaoLink(centerName: string, memberId?: string): Promise<string> {
  try {
    const centerConfig = await getCenterConfig(centerName);
    
    if (!centerConfig) {
      console.warn(`센터 설정을 찾을 수 없음: ${centerName}`);
      const defaultBotId = await getDefaultKakaoBotId();
      return `https://pf.kakao.com/${defaultBotId}/chat${memberId ? `?member_id=${memberId}` : ''}`;
    }

    const baseUrl = `https://pf.kakao.com/${centerConfig.kakao_bot_id}/chat`;
    return memberId ? `${baseUrl}?member_id=${memberId}` : baseUrl;
  } catch (error) {
    console.error('카카오챗봇 링크 생성 실패:', error);
    const defaultBotId = await getDefaultKakaoBotId();
    return `https://pf.kakao.com/${defaultBotId}/chat${memberId ? `?member_id=${memberId}` : ''}`;
  }
}

/**
 * 센터 설정을 추가/수정합니다 (관리자용)
 */
export async function upsertCenterConfig(config: Partial<CenterConfig>): Promise<CenterConfig> {
  try {
    const { data, error } = await supabaseClient
      .from('center_config')
      .upsert(config, { onConflict: 'center_name' })
      .select()
      .single();

    if (error) {
      console.error('센터 설정 저장 오류:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('센터 설정 저장 실패:', error);
    throw error;
  }
}
