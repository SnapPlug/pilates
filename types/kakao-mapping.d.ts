export interface KakaoUserMapping {
  id: string;
  member_id: string;
  kakao_user_id: string;
  mapping_status: 'pending' | 'verified' | 'expired';
  verification_code?: string;
  verification_expires_at?: string;
  created_at: string;
  verified_at?: string;
  last_activity_at: string;
}

export interface KakaoUserMappingRow {
  id: string;
  member_id: string;
  kakao_user_id: string;
  mapping_status: 'pending' | 'verified' | 'expired';
  verification_code: string | null;
  verification_expires_at: string | null;
  created_at: string;
  verified_at: string | null;
  last_activity_at: string;
}

export interface MemberWithKakaoMapping {
  id: string;
  name: string;
  phone: string;
  kakao_user_id: string | null;
  mapping_status?: 'pending' | 'verified' | 'expired';
  verification_code?: string;
  verification_expires_at?: string;
}
