"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export default function DebugClassTable() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const checkClassTable = async () => {
    setLoading(true);
    setResult("");

    try {
      // 1. 테이블 존재 확인
      const { data: tableInfo, error: tableError } = await supabase
        .from("class")
        .select("*")
        .limit(1);

      if (tableError) {
        setResult(`테이블 오류: ${JSON.stringify(tableError, null, 2)}`);
        return;
      }

      setResult("✅ class 테이블 존재 확인됨\n\n");

      // 2. 테이블 구조 확인 (샘플 데이터로)
      const { data: sampleData, error: sampleError } = await supabase
        .from("class")
        .select("*")
        .limit(1);

      if (sampleError) {
        setResult(prev => prev + `샘플 데이터 조회 오류: ${JSON.stringify(sampleError, null, 2)}`);
        return;
      }

      if (sampleData && sampleData.length > 0) {
        setResult(prev => prev + `테이블 구조:\n${JSON.stringify(sampleData[0], null, 2)}\n\n`);
      } else {
        setResult(prev => prev + "테이블이 비어있습니다.\n\n");
      }

      // 3. 테스트 데이터 삽입 시도
      const testData = {
        class_date: "2025-08-18",
        class_time: "14:00",
        capacity: 3,
        instructor_id: null,
        notes: "테스트 수업"
      };

      const { data: insertData, error: insertError } = await supabase
        .from("class")
        .insert(testData)
        .select();

      if (insertError) {
        setResult(prev => prev + `테스트 데이터 삽입 오류:\n${JSON.stringify(insertError, null, 2)}`);
        return;
      }

      setResult(prev => prev + `✅ 테스트 데이터 삽입 성공:\n${JSON.stringify(insertData, null, 2)}\n\n`);

      // 4. 삽입된 테스트 데이터 삭제
      if (insertData && insertData.length > 0) {
        const { error: deleteError } = await supabase
          .from("class")
          .delete()
          .eq("id", (insertData[0] as any).id);

        if (deleteError) {
          setResult(prev => prev + `테스트 데이터 삭제 오류: ${JSON.stringify(deleteError, null, 2)}`);
        } else {
          setResult(prev => prev + "✅ 테스트 데이터 삭제 완료");
        }
      }

    } catch (error) {
      setResult(`일반 오류: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Class 테이블 디버그</h1>
      
      <Button 
        onClick={checkClassTable} 
        disabled={loading}
        className="mb-4"
      >
        {loading ? "확인 중..." : "Class 테이블 확인"}
      </Button>

      {result && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">결과:</h2>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </div>
      )}
    </div>
  );
}
