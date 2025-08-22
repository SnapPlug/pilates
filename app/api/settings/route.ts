import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export interface SystemSettings {
  showInstructorName: boolean;
  showClassName: boolean;
  calendarView: '1주' | '2주' | '1달';
  weeklyRecommendedSessions: number;
  membershipExpirationBuffer: number;
  remainingSessionsThreshold: number;
}

// 설정 조회
export async function GET() {
  try {
    console.log('API: 설정 조회 시작');
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    console.log('API: Supabase 쿼리 결과:', { data, error });

    if (error) {
      console.log('API: Supabase 오류 발생:', error);
      
      // 테이블이 존재하지 않는 경우 (PGRST116)
      if (error.code === 'PGRST116') {
        console.log('API: system_settings 테이블이 존재하지 않음, 기본값 반환');
        const defaultSettings: SystemSettings = {
          showInstructorName: true,
          showClassName: true,
          calendarView: '1주',
          weeklyRecommendedSessions: 2,
          membershipExpirationBuffer: 3,
          remainingSessionsThreshold: 3
        };
        return NextResponse.json(defaultSettings);
      }
      
      // 다른 오류인 경우
      throw error;
    }

    // 데이터가 없으면 기본값 반환
    const defaultSettings: SystemSettings = {
      showInstructorName: true,
      showClassName: true,
      calendarView: '1주',
      weeklyRecommendedSessions: 2,
      membershipExpirationBuffer: 3,
      remainingSessionsThreshold: 3
    };

    if (!data) {
      console.log('API: 데이터가 없음, 기본값 반환');
      return NextResponse.json(defaultSettings);
    }

    const result = {
      showInstructorName: data.show_instructor_name ?? defaultSettings.showInstructorName,
      showClassName: data.show_class_name ?? defaultSettings.showClassName,
      calendarView: data.calendar_view ?? defaultSettings.calendarView,
      weeklyRecommendedSessions: data.weekly_recommended_sessions ?? defaultSettings.weeklyRecommendedSessions,
      membershipExpirationBuffer: data.membership_expiration_buffer ?? defaultSettings.membershipExpirationBuffer,
      remainingSessionsThreshold: data.remaining_sessions_threshold ?? defaultSettings.remainingSessionsThreshold
    };
    
    console.log('API: 설정 조회 성공:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('API: 설정 조회 중 예상치 못한 오류:', error);
    return NextResponse.json(
      { error: '설정을 불러오는데 실패했습니다.', details: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    );
  }
}

// 설정 저장
export async function POST(request: NextRequest) {
  try {
    console.log('API: 설정 저장 시작');
    
    const settings: SystemSettings = await request.json();
    console.log('API: 받은 설정:', settings);

    // 설정 저장 (upsert 방식)
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: 1, // 고정 ID 사용
        show_instructor_name: settings.showInstructorName,
        show_class_name: settings.showClassName,
        calendar_view: settings.calendarView,
        weekly_recommended_sessions: settings.weeklyRecommendedSessions,
        membership_expiration_buffer: settings.membershipExpirationBuffer,
        remaining_sessions_threshold: settings.remainingSessionsThreshold,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    console.log('API: Supabase upsert 결과:', { data, error });

    if (error) {
      console.error('API: Supabase upsert 오류:', error);
      throw error;
    }

    const result = {
      success: true,
      settings: {
        showInstructorName: data.show_instructor_name,
        showClassName: data.show_class_name,
        calendarView: data.calendar_view,
        weeklyRecommendedSessions: data.weekly_recommended_sessions,
        membershipExpirationBuffer: data.membership_expiration_buffer,
        remainingSessionsThreshold: data.remaining_sessions_threshold
      }
    };
    
    console.log('API: 설정 저장 성공:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('API: 설정 저장 중 예상치 못한 오류:', error);
    return NextResponse.json(
      { error: '설정을 저장하는데 실패했습니다.', details: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    );
  }
}
