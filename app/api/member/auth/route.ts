import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { kakao_user_id, phone_last4, full_phone, name, email, member_id } = await request.json();
    
    if (!kakao_user_id) {
      return NextResponse.json(
        { error: '카카오 사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // member_id가 제공된 경우 (QR코드나 직접 링크로 접속)
    if (member_id) {
      const { data: member, error: memberError } = await supabase
        .from('member')
        .select('*')
        .eq('id', member_id)
        .single();

      if (memberError || !member) {
        return NextResponse.json(
          { error: '회원을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // 이미 다른 사용자가 해당 카카오 ID를 사용하는지 확인
      const { data: existingMapping } = await supabase
        .from('member')
        .select('id, name')
        .eq('kakao_id', kakao_user_id)
        .neq('id', member_id)
        .single();

      if (existingMapping) {
        return NextResponse.json(
          { error: '이미 다른 회원이 해당 카카오 ID를 사용하고 있습니다.' },
          { status: 409 }
        );
      }

      // 카카오 ID 매핑
      const { error: updateError } = await supabase
        .from('member')
        .update({ kakao_id: kakao_user_id })
        .eq('id', member_id);

      if (updateError) {
        console.error('카카오 ID 매핑 오류:', updateError);
        return NextResponse.json(
          { error: '카카오 ID 매핑 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      // 매핑된 회원 정보와 회원권 정보 반환
      const { data: membershipHistory } = await supabase
        .from('membership_history')
        .select('*')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });

      return NextResponse.json({
        success: true,
        type: 'direct_mapping',
        member: { ...member, kakao_id: kakao_user_id },
        membership_history: membershipHistory || [],
        message: '회원과 성공적으로 연결되었습니다.'
      });
    }

    // 1단계: 이미 매핑된 사용자인지 확인
    const { data: existingMember } = await supabase
      .from('member')
      .select('*')
      .eq('kakao_id', kakao_user_id)
      .single();

    if (existingMember) {
      // 이미 매핑된 사용자 - 회원권 정보와 함께 반환
      const { data: membershipHistory } = await supabase
        .from('membership_history')
        .select('*')
        .eq('member_id', existingMember.id)
        .order('created_at', { ascending: false });

      return NextResponse.json({
        success: true,
        type: 'existing_member',
        member: existingMember,
        membership_history: membershipHistory || [],
        message: '기존 회원으로 인식되었습니다.'
      });
    }

    // 2단계: 이름과 전화번호로 기존 회원 찾기 (매핑되지 않은)
    let searchQuery = supabase.from('member').select('*');
    
    if (name && full_phone) {
      // 이름과 전체 전화번호로 정확한 매칭
      searchQuery = searchQuery.eq('name', name).eq('phone', full_phone);
    } else if (name && phone_last4) {
      // 이름과 전화번호 끝 4자리로 매칭
      searchQuery = searchQuery.eq('name', name).like('phone', `%${phone_last4}`);
    } else if (full_phone) {
      // 전체 전화번호로만 매칭
      searchQuery = searchQuery.eq('phone', full_phone);
    } else if (phone_last4 && name) {
      // 전화번호 끝 4자리와 이름으로 매칭
      searchQuery = searchQuery.like('phone', `%${phone_last4}`).eq('name', name);
    } else if (phone_last4) {
      // 전화번호 끝 4자리로만 매칭
      searchQuery = searchQuery.like('phone', `%${phone_last4}`);
    } else if (name) {
      // 이름으로만 매칭
      searchQuery = searchQuery.eq('name', name);
    } else {
      return NextResponse.json(
        { error: '이름 또는 전화번호가 필요합니다.' },
        { status: 400 }
      );
    }

    const { data: unmappedMembers, error: searchError } = await searchQuery;

    if (searchError) {
      console.error('회원 검색 오류:', searchError);
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
        is_temp: true // 임시 회원 플래그
      };

      const { data: newMember, error: createError } = await supabase
        .from('member')
        .insert(tempMemberData)
        .select()
        .single();

      if (createError) {
        console.error('임시 회원 생성 오류:', createError);
        return NextResponse.json(
          { error: '임시 회원 생성 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        type: 'new_temp_member',
        member: newMember,
        membership_history: [],
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
        console.error('카카오 ID 매핑 오류:', updateError);
        return NextResponse.json(
          { error: '카카오 ID 매핑 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      // 매핑된 회원 정보와 회원권 정보 반환
      const { data: membershipHistory } = await supabase
        .from('membership_history')
        .select('*')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });

      return NextResponse.json({
        success: true,
        type: 'mapped_member',
        member: { ...member, kakao_id: kakao_user_id },
        membership_history: membershipHistory || [],
        message: '기존 회원과 성공적으로 연결되었습니다.'
      });
    }

    // 여러 회원이 발견된 경우 - 추가 정보 요청
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

  } catch (error) {
    console.error('인증 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 특정 회원 ID로 직접 매핑 (QR코드 등에서 사용)
export async function PUT(request: NextRequest) {
  try {
    const { kakao_user_id, member_id } = await request.json();
    
    if (!kakao_user_id || !member_id) {
      return NextResponse.json(
        { error: '카카오 사용자 ID와 회원 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 이미 다른 사용자가 해당 카카오 ID를 사용하는지 확인
    const { data: existingMapping } = await supabase
      .from('member')
      .select('id, name')
      .eq('kakao_id', kakao_user_id)
      .neq('id', member_id)
      .single();

    if (existingMapping) {
      return NextResponse.json(
        { error: '이미 다른 회원이 해당 카카오 ID를 사용하고 있습니다.' },
        { status: 409 }
      );
    }

    // 카카오 ID 매핑
    const { error: updateError } = await supabase
      .from('member')
      .update({ kakao_id: kakao_user_id })
      .eq('id', member_id);

    if (updateError) {
      console.error('카카오 ID 매핑 오류:', updateError);
      return NextResponse.json(
        { error: '카카오 ID 매핑 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '카카오 ID가 성공적으로 매핑되었습니다.'
    });

  } catch (error) {
    console.error('매핑 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
