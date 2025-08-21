import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kakaoUserId = searchParams.get('kakao_user_id');
    const memberName = searchParams.get('name');
    const memberPhone = searchParams.get('phone');

    if (!kakaoUserId && (!memberName || !memberPhone)) {
      return NextResponse.json(
        { error: 'kakao_user_id 또는 name과 phone이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('API: 예약 조회 시작', { kakaoUserId, memberName, memberPhone });

    let memberId: string | null = null;

    // 1. 회원 찾기
    let memberData: any = null;
    
    if (kakaoUserId) {
      // kakao_user_id로 회원 찾기
      const { data, error: memberError } = await supabaseClient
        .from('member')
        .select('id, name, phone')
        .eq('kakao_user_id', kakaoUserId)
        .single();

      if (memberError || !data) {
        console.log('kakao_user_id로 회원을 찾을 수 없음:', kakaoUserId);
        return NextResponse.json(
          { error: '회원을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      memberData = data;
      memberId = (data as any).id;
      console.log('kakao_user_id로 회원 찾음:', data);
    } else {
      // 이름과 전화번호로 회원 찾기
      const { data, error: memberError } = await supabaseClient
        .from('member')
        .select('id, name, phone')
        .eq('name', memberName || '')
        .eq('phone', memberPhone || '')
        .single();

      if (memberError || !data) {
        console.log('이름/전화번호로 회원을 찾을 수 없음:', { memberName, memberPhone });
        return NextResponse.json(
          { error: '회원을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      memberData = data;
      memberId = (data as any).id;
      console.log('이름/전화번호로 회원 찾음:', data);
    }

    // 2. 현재 시간 이후의 예약 조회
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // 2. 예약 조회 (해당 회원의 모든 예약 레코드)
    const { data: reservations, error: reservationError } = await supabaseClient
      .from('reservation')
      .select('id, name, phone, created_at, class_id')
      .eq('name', memberData.name)
      .eq('phone', memberData.phone);

    if (reservationError) {
      console.error('예약 조회 오류:', reservationError);
      return NextResponse.json(
        { error: '예약 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    console.log('예약 조회 결과:', reservations);

    // 3. 예약이 참조하는 수업(class) 정보를 한번에 가져와서 날짜/시간을 구성
    const classIds = (reservations || [])
      .map((r: any) => r.class_id)
      .filter((id: string | null) => Boolean(id));

    let classesById: Record<string, { id: string; class_date: string; class_time: string }> = {};
    if (classIds.length > 0) {
      const { data: classes, error: classError } = await supabaseClient
        .from('class')
        .select('id, class_date, class_time')
        .in('id', classIds as string[]);

      if (classError) {
        console.error('수업 정보 조회 오류:', classError);
      } else if (classes) {
        classesById = classes.reduce((acc: any, cur: any) => {
          acc[cur.id] = { id: cur.id, class_date: cur.class_date, class_time: cur.class_time };
          return acc;
        }, {} as Record<string, { id: string; class_date: string; class_time: string }>);
      }
    }

    // 4. 현재 시각 이후의 예약만 남기고, 날짜/시간 문자열로 포맷
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const nowTimeStr = new Date(now.getTime()).toTimeString().slice(0, 5); // HH:MM

    const upcoming = (reservations || [])
      .map((r: any) => {
        const cls = classesById[r.class_id as string];
        return {
          reservation: r,
          classInfo: cls,
        };
      })
      .filter(({ classInfo }) => {
        if (!classInfo) return false;
        const d = classInfo.class_date as string; // YYYY-MM-DD
        const t = (classInfo.class_time as string) || '00:00'; // HH:MM
        return d > todayStr || (d === todayStr && t >= nowTimeStr);
      })
      .sort((a, b) => {
        const ad = a.classInfo!.class_date + ' ' + a.classInfo!.class_time;
        const bd = b.classInfo!.class_date + ' ' + b.classInfo!.class_time;
        return ad.localeCompare(bd);
      });

    const formattedReservations = upcoming.map(({ classInfo }) => {
      const [year, month, day] = (classInfo!.class_date as string).split('-');
      const [hour] = ((classInfo!.class_time as string) || '00:00').split(':');
      
      // 요일 계산
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      const weekday = weekdays[date.getDay()];
      
      return `${Number(month)}/${Number(day)}(${weekday}) ${Number(hour)}시`;
    });

    // 4. 응답 데이터 구성
    const responseData = {
      member: {
        id: memberId,
        name: memberData.name,
        phone: memberData.phone
      },
      reservations: upcoming.map(u => u.reservation) || [],
      formatted_reservations: formattedReservations,
      total_count: upcoming.length || 0,
      current_time: now.toISOString()
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('API: 예상치 못한 오류', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
