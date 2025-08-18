import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        return await getMappingStats();
      case 'mapped':
        return await getMappedMembers();
      case 'unmapped':
        return await getUnmappedMembers();
      case 'reservations':
        return await getReservationStats();
      case 'test':
        return await testMapping();
      default:
        return await getAllMappingData();
    }
  } catch (error) {
    console.error('매핑 디버그 오류:', error);
    return NextResponse.json(
      { error: '매핑 디버그 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

async function getMappingStats() {
  const { data, error } = await supabaseClient
    .from('member')
    .select('kakao_user_id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = data?.length || 0;
  const mapped = data?.filter(m => m.kakao_user_id).length || 0;

  return NextResponse.json({
    total_members: total,
    mapped_members: mapped,
    unmapped_members: total - mapped,
    mapping_percentage: total > 0 ? Math.round((mapped / total) * 100 * 100) / 100 : 0
  });
}

async function getMappedMembers() {
  const { data, error } = await supabaseClient
    .from('member')
    .select('id, name, phone, kakao_user_id, membership_status, created_at')
    .not('kakao_user_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

async function getUnmappedMembers() {
  const { data, error } = await supabaseClient
    .from('member')
    .select('id, name, phone, membership_status, created_at')
    .is('kakao_user_id', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

async function getReservationStats() {
  const { data, error } = await supabaseClient
    .from('reservation')
    .select('uid');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = data?.length || 0;
  const withKakaoId = data?.filter(r => r.uid).length || 0;

  return NextResponse.json({
    total_reservations: total,
    reservations_with_kakao_id: withKakaoId,
    reservations_without_kakao_id: total - withKakaoId
  });
}

async function testMapping() {
  const testKakaoId = 'test_kakao_user_' + Date.now();
  const testName = '테스트회원';
  const testPhone = '010-1234-5678';

  try {
    const { data, error } = await supabaseClient
      .from('member')
      .insert({
        name: testName,
        phone: testPhone,
        membership_status: '활성',
        kakao_user_id: testKakaoId
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '테스트 매핑 성공',
      data: {
        id: data.id,
        name: data.name,
        kakao_user_id: data.kakao_user_id
      }
    });
  } catch (error) {
    return NextResponse.json({ error: '테스트 매핑 실패' }, { status: 500 });
  }
}

async function getAllMappingData() {
  try {
    // 모든 데이터를 한 번에 조회
    const [stats, mappedMembers, unmappedMembers, reservationStats] = await Promise.all([
      getMappingStats().then(res => res.json()),
      getMappedMembers().then(res => res.json()),
      getUnmappedMembers().then(res => res.json()),
      getReservationStats().then(res => res.json())
    ]);

    return NextResponse.json({
      stats,
      mappedMembers,
      unmappedMembers,
      reservationStats
    });
  } catch (error) {
    return NextResponse.json({ error: '전체 데이터 조회 실패' }, { status: 500 });
  }
}
