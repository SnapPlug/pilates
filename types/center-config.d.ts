export interface CenterConfig {
  id: string;
  center_name: string;
  kakao_bot_id: string;
  kakao_channel_id?: string;
  center_address?: string;
  center_phone?: string;
  center_email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CenterConfigRow {
  id: string;
  center_name: string;
  kakao_bot_id: string;
  kakao_channel_id: string | null;
  center_address: string | null;
  center_phone: string | null;
  center_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
