"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DebugMemberTable() {
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDebugChecks = async () => {
      const info: any = {};

      // 1. 환경 변수 확인
      info.envVars = {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "설정됨" : "설정되지 않음",
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "설정됨" : "설정되지 않음",
      };

      // 2. Supabase 연결 테스트
      try {
        const { data, error } = await supabase.from("member").select("count").limit(1);
        info.connection = {
          success: !error,
          error: error?.message || null,
          data: data
        };
      } catch (e) {
        info.connection = {
          success: false,
          error: e instanceof Error ? e.message : "Unknown error",
          data: null
        };
      }

      // 3. 테이블 존재 여부 확인 (직접 접근 방식)
      try {
        const { data, error } = await supabase
          .from("member")
          .select("id")
          .limit(1);
        
        info.tableExists = {
          success: !error,
          error: error?.message || null,
          exists: !error,
          data: data
        };
      } catch (e) {
        info.tableExists = {
          success: false,
          error: e instanceof Error ? e.message : "Unknown error",
          exists: false,
          data: null
        };
      }

      // 4. RLS 정책 확인 (간접 확인 방식)
      try {
        // RLS가 활성화되어 있는지 간접적으로 확인
        const { data, error } = await supabase
          .from("member")
          .select("id")
          .limit(1);
        
        // 오류 메시지로 RLS 정책 문제인지 판단
        const isRlsError = error?.message?.includes("policy") || error?.message?.includes("permission");
        
        info.rlsPolicies = {
          success: !isRlsError,
          error: isRlsError ? "RLS 정책으로 인한 접근 제한" : null,
          policies: isRlsError ? [] : [{ policy_name: "접근 가능", table_name: "member", permissive: true, cmd: "ALL" }]
        };
      } catch (e) {
        info.rlsPolicies = {
          success: false,
          error: e instanceof Error ? e.message : "Unknown error",
          policies: []
        };
      }

      // 5. 실제 데이터 조회 시도
      try {
        const { data, error } = await supabase
          .from("member")
          .select("*")
          .limit(5);
        
        info.dataQuery = {
          success: !error,
          error: error?.message || null,
          count: data?.length || 0,
          sample: data?.slice(0, 2) || []
        };
      } catch (e) {
        info.dataQuery = {
          success: false,
          error: e instanceof Error ? e.message : "Unknown error",
          count: 0,
          sample: []
        };
      }

      setDebugInfo(info);
      setLoading(false);
    };

    runDebugChecks();
  }, []);

  if (loading) {
    return <div className="p-8">진단 중...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Member 테이블 디버그 정보</h1>
      
      <div className="space-y-6">
        {/* 환경 변수 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">1. 환경 변수</h2>
          <div className="grid grid-cols-2 gap-2">
            <div>SUPABASE_URL: <span className={debugInfo.envVars?.supabaseUrl === "설정됨" ? "text-green-600" : "text-red-600"}>{debugInfo.envVars?.supabaseUrl}</span></div>
            <div>SUPABASE_ANON_KEY: <span className={debugInfo.envVars?.supabaseAnonKey === "설정됨" ? "text-green-600" : "text-red-600"}>{debugInfo.envVars?.supabaseAnonKey}</span></div>
          </div>
        </div>

        {/* 연결 테스트 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">2. Supabase 연결</h2>
          <div className={debugInfo.connection?.success ? "text-green-600" : "text-red-600"}>
            {debugInfo.connection?.success ? "✅ 연결 성공" : "❌ 연결 실패"}
          </div>
          {debugInfo.connection?.error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              오류: {debugInfo.connection.error}
            </div>
          )}
        </div>

        {/* 테이블 존재 여부 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">3. Member 테이블 존재 여부</h2>
          <div className={debugInfo.tableExists?.exists ? "text-green-600" : "text-red-600"}>
            {debugInfo.tableExists?.exists ? "✅ 테이블 존재" : "❌ 테이블 없음"}
          </div>
          {debugInfo.tableExists?.error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              오류: {debugInfo.tableExists.error}
            </div>
          )}
        </div>

        {/* RLS 정책 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">4. RLS 정책</h2>
          {debugInfo.rlsPolicies?.success ? (
            <div>
              <div className="text-green-600 mb-2">✅ 정책 조회 성공</div>
              {debugInfo.rlsPolicies.policies.length > 0 ? (
                <div className="space-y-2">
                  {debugInfo.rlsPolicies.policies.map((policy: any, index: number) => (
                    <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                      <div><strong>정책명:</strong> {policy.policy_name}</div>
                      <div><strong>테이블:</strong> {policy.table_name}</div>
                      <div><strong>권한:</strong> {policy.permissive ? "허용" : "거부"}</div>
                      <div><strong>명령:</strong> {policy.cmd}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-yellow-600">⚠️ RLS 정책이 없습니다. 모든 접근이 차단될 수 있습니다.</div>
              )}
            </div>
          ) : (
            <div className="text-red-600">
              ❌ 정책 조회 실패
              {debugInfo.rlsPolicies?.error && (
                <div className="mt-2 text-sm bg-red-50 p-2 rounded">
                  오류: {debugInfo.rlsPolicies.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 데이터 조회 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">5. 데이터 조회 테스트</h2>
          {debugInfo.dataQuery?.success ? (
            <div>
              <div className="text-green-600 mb-2">✅ 데이터 조회 성공</div>
              <div>총 {debugInfo.dataQuery.count}개 레코드</div>
              {debugInfo.dataQuery.sample.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm font-medium mb-1">샘플 데이터:</div>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                    {JSON.stringify(debugInfo.dataQuery.sample, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-600">
              ❌ 데이터 조회 실패
              {debugInfo.dataQuery?.error && (
                <div className="mt-2 text-sm bg-red-50 p-2 rounded">
                  오류: {debugInfo.dataQuery.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 해결 방법 */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <h2 className="text-lg font-semibold mb-3">🔧 해결 방법</h2>
          <div className="space-y-2 text-sm">
            {!debugInfo.envVars?.supabaseUrl || !debugInfo.envVars?.supabaseAnonKey ? (
              <div>1. <strong>환경 변수 설정:</strong> .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정하세요.</div>
            ) : null}
            {!debugInfo.tableExists?.exists ? (
              <div>2. <strong>테이블 생성:</strong> Supabase 대시보드에서 member 테이블을 생성하세요.</div>
            ) : null}
            {debugInfo.rlsPolicies?.policies?.length === 0 ? (
              <div>3. <strong>RLS 정책 설정:</strong> member 테이블에 적절한 RLS 정책을 추가하세요.</div>
            ) : null}
            {debugInfo.connection?.success && debugInfo.tableExists?.exists && debugInfo.rlsPolicies?.policies?.length > 0 && !debugInfo.dataQuery?.success ? (
              <div>4. <strong>권한 확인:</strong> 현재 사용자가 member 테이블에 접근할 권한이 있는지 확인하세요.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
