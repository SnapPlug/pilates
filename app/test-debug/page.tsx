"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function TestDebugInner() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog("=== 테스트 페이지 로드됨 ===");
    
    const uid = searchParams?.get("uid");
    const name = searchParams?.get("name");
    
    addLog(`URL 파라미터 - uid: ${uid}, name: ${name}`);
    
    // 간단한 테스트
    addLog("기본 JavaScript 테스트 시작");
    
    try {
      // 1. 기본 연산 테스트
      const result = 1 + 1;
      addLog(`1 + 1 = ${result}`);
      
      // 2. 객체 생성 테스트
      const obj = { test: "success" };
      addLog(`객체 생성: ${JSON.stringify(obj)}`);
      
      // 3. 배열 테스트
      const arr = [1, 2, 3];
      addLog(`배열 생성: ${arr.join(", ")}`);
      
      addLog("모든 기본 테스트 통과!");
      
    } catch (error) {
      addLog(`오류 발생: ${error}`);
    }
  }, [searchParams]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">디버깅 테스트 페이지</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">URL 파라미터:</h2>
        <div className="bg-gray-100 p-2 rounded">
          <p>uid: {searchParams?.get("uid") || "없음"}</p>
          <p>name: {searchParams?.get("name") || "없음"}</p>
        </div>
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">로그:</h2>
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">테스트 버튼:</h2>
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => addLog("버튼 클릭됨!")}
        >
          클릭 테스트
        </button>
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">브라우저 정보:</h2>
        <div className="bg-gray-100 p-2 rounded text-sm">
          <p>User Agent: {navigator.userAgent}</p>
          <p>JavaScript 활성화: {typeof window !== 'undefined' ? '예' : '아니오'}</p>
        </div>
      </div>
         </div>
   );
}

export default function TestDebugPage() {
  return (
    <Suspense fallback={<div className="p-4">로딩 중...</div>}>
      <TestDebugInner />
    </Suspense>
  );
}
