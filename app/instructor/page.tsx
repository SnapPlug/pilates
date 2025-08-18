"use client";
import SidebarLayout from "@/components/dashboard/SidebarLayout";
import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Instructor = {
  id: string;
  name: string;
  gender: "남" | "여" | "기타";
  age: number;
  phone: string;
};

function toDisplayDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return String(value).slice(0, 10);
  }
}

export default function Page() {
  const [rows, setRows] = React.useState<Instructor[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [q, setQ] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [editing, setEditing] = React.useState<Instructor | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    gender: "" as Instructor["gender"],
    age: "",
    phone: "",
  });

  const fetchMembers = React.useCallback(async () => {
      try {
        setLoading(true);
        setError("");
        const { data, error } = await supabase
          .from("instructor")
          .select("id,name,gender,age,phone")
          .order("name", { ascending: true });
        if (error) throw error;
        type InstructorRow = {
          id: string;
          name: string | null;
          gender: Instructor["gender"] | null;
          age: number | null;
          phone: string | null;
        };
        const mapped: Instructor[] = (data as InstructorRow[] | null || []).map((r) => ({
          id: r.id,
          name: r.name ?? "",
          gender: (r.gender ?? "") as Instructor["gender"],
          age: Number(r.age ?? 0),
          phone: r.phone ?? "",
        }));
        setRows(mapped);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.";
        setError(msg);
      } finally {
        setLoading(false);
      }
  }, []);

  React.useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filtered = React.useMemo(() => {
    const t = q.trim();
    if (!t) return rows;
    return rows.filter((r) => [r.name, r.phone, r.gender].some((v) => String(v ?? "").includes(t)));
  }, [rows, q]);

  return (
    <>
    <SidebarLayout>
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">강사 정보</h1>
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="검색 (이름/전화/상태)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 rounded border px-3 text-sm bg-background"
            />
            <Button size="icon" className="rounded-full" onClick={() => setShowCreate(true)} aria-label="회원 추가">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading && <div className="text-sm">불러오는 중...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="overflow-auto rounded-lg border">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">강사명</th>
                <th className="px-3 py-2 text-left font-medium">성별</th>
                <th className="px-3 py-2 text-left font-medium">나이</th>
                <th className="px-3 py-2 text-left font-medium">전화번호</th>
                <th className="px-3 py-2 text-left font-medium"/>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-3 font-medium">{m.name}</td>
                  <td className="px-3 py-3">{m.gender}</td>
                  <td className="px-3 py-3 tabular-nums">{m.age}</td>
                  <td className="px-3 py-3">{m.phone}</td>
                  <td className="px-3 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={()=>{ setEditing(m); setForm({ name: m.name, gender: m.gender, age: String(m.age ?? ""), phone: m.phone }); }}>편집</Button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr className="border-t">
                  <td className="px-3 py-6 text-sm text-muted-foreground" colSpan={10}>데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-xl border bg-background p-4 shadow-lg">
              <div className="text-sm">강사 추가</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="col-span-2 text-xs">이름
                  <input className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.name} onChange={(e)=>setForm((f)=>({...f,name:e.target.value}))} />
                </label>
                <label className="text-xs">성별
                  <select className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.gender} onChange={(e)=>setForm((f)=>({...f,gender:e.target.value as Instructor["gender"]}))}>
                    <option value="">선택</option>
                    <option value="남">남</option>
                    <option value="여">여</option>
                    <option value="기타">기타</option>
                  </select>
                </label>
                <label className="text-xs">나이
                  <input type="number" className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.age} onChange={(e)=>setForm((f)=>({...f,age:e.target.value}))} />
                </label>
                <label className="col-span-2 text-xs">전화번호
                  <input className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.phone} onChange={(e)=>setForm((f)=>({...f,phone:e.target.value}))} />
                </label>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={()=> setShowCreate(false)}>취소</Button>
                <Button size="sm" disabled={saving} onClick={async ()=>{
                  if(!form.name){ alert("이름을 입력해주세요."); return; }
                  try{
                    setSaving(true);
                    const payload = {
                      name: form.name,
                      gender: form.gender || null,
                      age: form.age ? Number(form.age) : null,
                      phone: form.phone || null,
                    };
                    const { error } = await supabase.from("instructor").insert(payload);
                    if(error) throw error;
                    setShowCreate(false);
                    setForm({name:"",gender:"" as Instructor["gender"],age:"",phone:""});
                    await fetchMembers();
                  }catch(e){
                    const msg = e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.";
                    alert(msg);
                  }finally{
                    setSaving(false);
                  }
                }}>{saving?"저장 중...":"저장"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
    {editing && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-lg rounded-xl border bg-background p-4 shadow-lg">
          <div className="text-sm">강사 수정</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="col-span-2 text-xs">이름
              <input className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.name} onChange={(e)=>setForm((f)=>({...f,name:e.target.value}))} />
            </label>
            <label className="text-xs">성별
              <select className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.gender} onChange={(e)=>setForm((f)=>({...f,gender:e.target.value as Instructor["gender"]}))}>
                <option value="">선택</option>
                <option value="남">남</option>
                <option value="여">여</option>
                <option value="기타">기타</option>
              </select>
            </label>
            <label className="text-xs">나이
              <input type="number" className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.age} onChange={(e)=>setForm((f)=>({...f,age:e.target.value}))} />
            </label>
            <label className="col-span-2 text-xs">전화번호
              <input className="mt-1 w-full h-9 rounded border bg-background px-2 text-sm" value={form.phone} onChange={(e)=>setForm((f)=>({...f,phone:e.target.value}))} />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={()=> setEditing(null)}>취소</Button>
            <Button size="sm" disabled={saving} onClick={async ()=>{
              if(!editing) return; if(!form.name){ alert("이름을 입력해주세요."); return; }
              try{
                setSaving(true);
                const { error } = await supabase.from("instructor").update({
                  name: form.name,
                  gender: form.gender || null,
                  age: form.age ? Number(form.age) : null,
                  phone: form.phone || null,
                }).eq("id", editing.id);
                if(error) throw error;
                setEditing(null);
                await fetchMembers();
              }catch(e){
                const msg = e instanceof Error ? e.message : "수정 중 오류가 발생했습니다.";
                alert(msg);
              }finally{
                setSaving(false);
              }
            }}>{saving?"저장 중...":"저장"}</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

