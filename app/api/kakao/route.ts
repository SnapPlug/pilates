import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// 카카오챗봇 통합 API
export async function POST(request: NextRequest) {
  try {
    const { 
      action, 
      kakao_user_id, 
      member_id, 
      phone_last4, 
      full_phone, 
      name, 
      email,
      class_id,
      reservation_date
    } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'action이 필요합니다.' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'authenticate':
        return await handleAuthentication({
          kakao_user_id,
          phone_last4,
          full_phone,
          name,
          email
        });

      case 'get_membership_info':
        return await handleGetMembershipInfo(kakao_user_id);

      case 'get_reservations':
        return await handleGetReservations(kakao_user_id);

      case 'make_reservation':
        return await handleMakeReservation({
          kakao_user_id,
          class_id,
          reservation_date
        });

      case 'cancel_reservation':
        return await handleCancelReservation({
          kakao_user_id,
          class_id,
          reservation_date
        });

      case 'get_available_classes':
        return await handleGetAvailableClasses();

      default:
        return NextResponse.json(
          { error: '지원하지 않는 action입니다.' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('카카오 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자 인증 처리
async function handleAuthentication(params: {
  kakao_user_id: string;
  phone_last4?: string;
  full_phone?: string;
  name?: string;
  email?: string;
}) {
  const { kakao_user_id, phone_last4, full_phone, name } = params;

  if (!kakao_user_id) {
    return NextResponse.json(
      { error: '카카오 사용자 ID가 필요합니다.' },
      { status: 400 }
    );
  }

  // 1단계: 이미 매핑된 사용자인지 확인
  const { data: existingMember } = await supabase
    .from('member')
    .select('*')
    .eq('kakao_id', kakao_user_id)
    .single();

  if (existingMember) {
    return NextResponse.json({
      success: true,
      type: 'existing_member',
      member: existingMember,
      message: '기존 회원으로 인식되었습니다.'
    });
  }

  // 2단계: 전화번호로 기존 회원 찾기
  let searchQuery = supabase.from('member').select('*');
  
  if (full_phone) {
    searchQuery = searchQuery.eq('phone', full_phone);
  } else if (phone_last4 && name) {
    searchQuery = searchQuery.like('phone', `%${phone_last4}`).eq('name', name);
  } else if (phone_last4) {
    searchQuery = searchQuery.like('phone', `%${phone_last4}`);
  } else {
    return NextResponse.json(
      { error: '전화번호 또는 전화번호 끝 4자리와 이름이 필요합니다.' },
      { status: 400 }
    );
  }

  const { data: unmappedMembers, error: searchError } = await searchQuery;

  if (searchError) {
    return NextResponse.json(
      { error: '회원 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }

  if (!unmappedMembers || unmappedMembers.length === 0) {
    // 3단계: 신규 사용자 - 임시 회원 생성
    const tempMemberData = {
      name: name || '미등록 사용자',
      phone: full_phone || `temp_${kakao_user_id}`,
      kakao_id: kakao_user_id,
      membership_status: '임시',
      registered_at: new Date().toISOString(),
      is_temp: true
    };

    const { data: newMember, error: createError } = await supabase
      .from('member')
      .insert(tempMemberData)
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: '임시 회원 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      type: 'new_temp_member',
      member: newMember,
      message: '신규 사용자로 임시 등록되었습니다. 관리자에게 연락하여 정식 등록을 완료해주세요.',
      requires_registration: true
    });
  }

  if (unmappedMembers.length === 1) {
    // 단일 회원 발견 - 카카오 ID 매핑
    const member = unmappedMembers[0];
    
    const { error: updateError } = await supabase
      .from('member')
      .update({ kakao_id: kakao_user_id })
      .eq('id', member.id);

    if (updateError) {
      return NextResponse.json(
        { error: '카카오 ID 매핑 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      type: 'mapped_member',
      member: { ...member, kakao_id: kakao_user_id },
      message: '기존 회원과 성공적으로 연결되었습니다.'
    });
  }

  // 여러 회원이 발견된 경우
  return NextResponse.json({
    success: false,
    type: 'multiple_candidates',
    candidates: unmappedMembers.map(m => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      registered_at: m.registered_at
    })),
    message: '동일한 정보의 회원이 여러 명 있습니다. 더 자세한 정보를 제공해주세요.',
    requires_additional_info: true
  });
}

// 회원권 정보 조회
async function handleGetMembershipInfo(kakao_user_id: string) {
  const { data: member, error: memberError } = await supabase
    .from('member')
    .select('*')
    .eq('kakao_id', kakao_user_id)
    .single();

  if (memberError || !member) {
    return NextResponse.json(
      { error: '회원 정보를 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const { data: membershipHistory } = await supabase
    .from('membership_history')
    .select('*')
    .eq('member_id', member.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    success: true,
    member,
    membership_history: membershipHistory || []
  });
}

// 예약 정보 조회
async function handleGetReservations(kakao_user_id: string) {
  const { data: member, error: memberError } = await supabase
    .from('member')
    .select('id')
    .eq('kakao_id', kakao_user_id)
    .single();

  if (memberError || !member) {
    return NextResponse.json(
      { error: '회원 정보를 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const { data: reservations } = await supabase
    .from('reservation')
    .select(`
      *,
      class:class_id (
        id,
        date,
        time,
        instructor_id,
        instructor:instructor_id (name)
      )
    `)
    .eq('member_id', member.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    success: true,
    reservations: reservations || []
  });
}

// 예약 생성
async function handleMakeReservation(params: {
  kakao_user_id: string;
  class_id: string;
  reservation_date: string;
}) {
  const { kakao_user_id, class_id, reservation_date } = params;

  const { data: member, error: memberError } = await supabase
    .from('member')
    .select('id')
    .eq('kakao_id', kakao_user_id)
    .single();

  if (memberError || !member) {
    return NextResponse.json(
      { error: '회원 정보를 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const { data: reservation, error: reservationError } = await supabase
    .from('reservation')
    .insert({
      member_id: member.id,
      class_id,
      reservation_date,
      status: 'confirmed'
    })
    .select()
    .single();

  if (reservationError) {
    return NextResponse.json(
      { error: '예약 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    reservation,
    message: '예약이 완료되었습니다.'
  });
}

// 예약 취소
async function handleCancelReservation(params: {
  kakao_user_id: string;
  class_id: string;
  reservation_date: string;
}) {
  const { kakao_user_id, class_id, reservation_date } = params;

  const { data: member, error: memberError } = await supabase
    .from('member')
    .select('id')
    .eq('kakao_id', kakao_user_id)
    .single();

  if (memberError || !member) {
    return NextResponse.json(
      { error: '회원 정보를 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const { error: updateError } = await supabase
    .from('reservation')
    .update({ status: 'cancelled' })
    .eq('member_id', member.id)
    .eq('class_id', class_id)
    .eq('reservation_date', reservation_date);

  if (updateError) {
    return NextResponse.json(
      { error: '예약 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: '예약이 취소되었습니다.'
  });
}

// 이용 가능한 수업 조회
async function handleGetAvailableClasses() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: classes } = await supabase
    .from('class')
    .select(`
      *,
      instructor:instructor_id (name),
      reservations:reservation (id, member_id)
    `)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (!classes) {
    return NextResponse.json({
      success: true,
      classes: []
    });
  }

  // 각 수업의 예약 가능 여부 계산
  const availableClasses = classes.map(cls => {
    const reservationCount = cls.reservations?.length || 0;
    const isAvailable = reservationCount < cls.capacity;
    
    return {
      ...cls,
      available_spots: cls.capacity - reservationCount,
      is_available: isAvailable
    };
  });

  return NextResponse.json({
    success: true,
    classes: availableClasses
  });
}
