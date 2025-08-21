"use client";

import * as React from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { AttendanceModal } from "./attendance-modal";

type AppleCalendarProps = {
  className?: string;
  onAdd?: () => void;
};

export const AppleCalendar: React.FC<AppleCalendarProps> = ({ className, onAdd }) => {
  const router = useRouter();
  type DemoClass = {
    id?: string;
    date: string; // yyyy-MM-dd
    time: string; // HH:mm
    capacity: number;
    instructorName: string;
    instructorId?: string | null;
    members: string[]; // legacy demo field
    reservedCount?: number; // from reservation table
    reservations?: { id: string; name: string }[]; // from reservation table
  };
  type Instructor = { id: string; name: string };
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [view, setView] = React.useState<"month" | "week">("month");
  const [enabledWeekdays, setEnabledWeekdays] = React.useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [selectedHours, setSelectedHours] = React.useState<number[]>([]);
  const [showHourMenu, setShowHourMenu] = React.useState<boolean>(false);
  const [showWeekdayMenu, setShowWeekdayMenu] = React.useState<boolean>(false);
  const [demoClasses, setDemoClasses] = React.useState<DemoClass[]>([]);
  const [instructors, setInstructors] = React.useState<Instructor[]>([]);
  // 강사 이름을 찾는 헬퍼 함수
  const getInstructorName = (instructorId: string | null): string => {
    if (!instructorId) return "미지정";
    const instructor = instructors.find(i => i.id === instructorId);
    return instructor ? instructor.name : "미지정";
  };
  
  const [activeInstructorEdit, setActiveInstructorEdit] = React.useState<{ classId: string } | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = React.useState<string>("");
  const [showAddClassModal, setShowAddClassModal] = React.useState<boolean>(false);
  const [savingClass, setSavingClass] = React.useState<boolean>(false);
  const [addClassForm, setAddClassForm] = React.useState({
    date: "",
    time: "",
    capacity: "3",
    instructorId: "",
    notes: ""
  });
  
  // 출석 체크 관련 상태
  const [showAttendanceModal, setShowAttendanceModal] = React.useState<boolean>(false);
  const [selectedClassReservations, setSelectedClassReservations] = React.useState<Array<{
    id: string;
    name: string;
    attendance_status: string;
  }>>([]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const filteredWeekDays = React.useMemo(
    () => weekDays.filter((d) => enabledWeekdays.includes(d.getDay())),
    [weekDays, enabledWeekdays]
  );
  const allHours = React.useMemo(() => Array.from({ length: 24 }, (_, h) => h), []);
  const hours = React.useMemo(() => {
    if (selectedHours.length === 0) return allHours;
    return [...selectedHours].sort((a, b) => a - b);
  }, [selectedHours, allHours]);

  const formatHour = (h: number) => {
    const date = new Date();
    date.setHours(h, 0, 0, 0);
    return format(date, "a h시", { locale: ko });
  };

  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

    // 데이터 로딩 함수
  const loadDb = async () => {
    try {
      // 1. 먼저 강사 데이터 로드
      const { data: instructorData, error: instructorError } = await supabase
        .from("instructor")
        .select("id, name")
        .order("name", { ascending: true });
      
      if (!instructorError && instructorData) {
        const instructors: Instructor[] = instructorData.map((row: any) => ({
          id: row.id as string,
          name: row.name as string
        }));
        setInstructors(instructors);
        
        // 강사 ID를 이름으로 매핑하는 객체 생성
        const instructorMap: Record<string, string> = {};
        instructors.forEach(instructor => {
          instructorMap[instructor.id] = instructor.name;
        });
        
        // 2. 수업 데이터 로드 (강사 데이터 로드 후)
        const { data, error } = await supabase
          .from("class")
          .select("id,class_date,class_time,capacity,instructor_id");
        if (!error && data) {
          type ClassRowFromDb = { id: string; class_date: string | Date; class_time: string; capacity: number; instructor_id?: string | null };
          const mapped: DemoClass[] = (data as ClassRowFromDb[]).map((row) => ({
            id: row.id,
            date: String(row.class_date),
            time: String(row.class_time).slice(0, 5),
            capacity: Number(row.capacity ?? 0),
            instructorName: row.instructor_id ? (instructorMap[row.instructor_id] || "미지정") : "미지정",
            instructorId: row.instructor_id ?? null,
            members: [],
            reservedCount: 0,
            reservations: [],
          }));
          // DB 데이터만 사용 (로컬 데모 데이터와 병합하지 않음)
          setDemoClasses(mapped);
          // reservations: count and names per class
          try {
            const ids = (data as { id: string }[]).map((r) => r.id);
            if (ids.length > 0) {
              const { data: resv, error: resvErr } = await supabase
                .from("reservation")
                .select("id,class_id,name,attendance_status").in("class_id", ids as string[]);
              if (!resvErr && resv) {
                const counts: Record<string, number> = {};
                const byClass: Record<string, { id: string; name: string; attendance_status?: string }[]> = {};
                (resv as { id: string; class_id: string; name: string; attendance_status?: string }[]).forEach((r) => {
                  counts[r.class_id] = (counts[r.class_id] ?? 0) + 1;
                  if (!byClass[r.class_id]) byClass[r.class_id] = [];
                  byClass[r.class_id].push({ 
                    id: r.id, 
                    name: (r.name || "").trim(),
                    attendance_status: r.attendance_status || 'pending'
                  });
                });
                setDemoClasses((prev) => prev.map((c) => ({
                  ...c,
                  reservedCount: c.id && counts[c.id] ? counts[c.id] : (c.reservedCount ?? 0),
                  reservations: c.id && byClass[c.id] ? byClass[c.id] : [],
                })));
              }
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    }
  };

  // 출석 체크 함수들
  const handleAttendanceCheck = async (classId: string) => {
    try {
      // 해당 수업의 예약 정보 조회 (attendance_status 포함)
      const { data: reservations, error } = await supabase
        .from('reservation')
        .select('id, name, attendance_status')
        .eq('class_id', classId);

      console.log('출석 체크 - 예약 데이터 조회:', { classId, reservations, error });

      if (error) {
        console.error('예약 조회 오류:', error);
        alert('예약 정보를 불러오는데 실패했습니다.');
        return;
      }

      const typedReservations = (reservations || []).map((r: any) => ({
        id: r.id as string,
        name: r.name as string,
        attendance_status: r.attendance_status as string
      }));
      setSelectedClassReservations(typedReservations);
      setShowAttendanceModal(true);
    } catch (error) {
      console.error('출석 체크 오류:', error);
      alert('출석 체크를 불러오는데 실패했습니다.');
    }
  };

  const handleAttendanceUpdate = async (reservationId: string, status: string) => {
    try {
      const response = await fetch('/api/attendance/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservation_id: reservationId,
          attendance_status: status,
          checked_by: 'admin'
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('출석 상태 업데이트 성공:', result.data);
        
        // 성공 시 예약 목록 새로고침
        const updatedReservations = selectedClassReservations.map(reservation => 
          reservation.id === reservationId 
            ? { ...reservation, attendance_status: status }
            : reservation
        );
        setSelectedClassReservations(updatedReservations);
        
        // 캘린더 데이터 새로고침
        await loadDb();
        
        // 성공 메시지 표시
        alert('출석 상태가 업데이트되었습니다.');
      } else {
        throw new Error(result.error || '출석 상태 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('출석 업데이트 오류:', error);
      throw error;
    }
  };

  // 수업 추가 함수
  const handleAddClass = async () => {
    if (!addClassForm.date || !addClassForm.time || !addClassForm.capacity) {
      alert("날짜, 시간, 정원을 모두 입력해주세요.");
      return;
    }

    try {
      setSavingClass(true);
      
      // 입력 데이터 로깅
      console.log("수업 추가 폼 데이터:", addClassForm);
      
      // notes 컬럼이 없을 수 있으므로 조건부로 포함
      const insertData: {
        class_date: string;
        class_time: string;
        capacity: number;
        instructor_id: string | null;
        notes?: string;
      } = {
        class_date: addClassForm.date,
        class_time: addClassForm.time,
        capacity: Number(addClassForm.capacity),
        instructor_id: addClassForm.instructorId || null
      };

      // notes가 비어있지 않을 때만 포함
      if (addClassForm.notes && addClassForm.notes.trim()) {
        insertData.notes = addClassForm.notes.trim();
      }

      const { data, error } = await supabase.from("class").insert(insertData);

      if (error) {
        console.error("Supabase 오류:", error);
        throw error;
      }

      console.log("수업 추가 성공:", data);

      // 폼 초기화
      setAddClassForm({
        date: "",
        time: "",
        capacity: "3",
        instructorId: "",
        notes: ""
      });
      
      setShowAddClassModal(false);
      alert("수업이 추가되었습니다.");
      
      // 캘린더 새로고침
      window.location.reload();
    } catch (error) {
      console.error("수업 추가 오류:", error);
      
      // 구체적인 오류 메시지 표시
      let errorMessage = "수업 추가 중 오류가 발생했습니다.";
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorObj = error as { message?: string; details?: string; hint?: string };
        if (errorObj.message) {
          errorMessage = `오류: ${errorObj.message}`;
        }
        if (errorObj.details) {
          errorMessage += `\n상세: ${errorObj.details}`;
        }
        if (errorObj.hint) {
          errorMessage += `\n힌트: ${errorObj.hint}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setSavingClass(false);
    }
  };

  React.useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return;

    const load = () => {
      // demo_classes 사용 중지: 실데이터와 혼재되어 유령 수업이 표시될 수 있음
      try { localStorage.removeItem("demo_classes"); } catch {}
      try {
        const v = localStorage.getItem("calendar_view");
        if (v === "week" || v === "month") setView(v);
      } catch {}
      try {
        const ts = localStorage.getItem("calendar_current_date_ts");
        if (ts) {
          const n = Number(ts);
          if (!Number.isNaN(n)) setCurrentDate(new Date(n));
        }
      } catch {}
      
      // enabledWeekdays 초기화
      try {
        const raw = localStorage.getItem("calendar_enabled_weekdays");
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const cleaned = Array.from(new Set(arr.filter((n: unknown) => typeof n === "number").map((n: number) => Math.max(0, Math.min(6, Math.floor(n)))))).sort((a, b) => a - b);
            if (cleaned.length > 0) setEnabledWeekdays(cleaned as number[]);
          }
        }
      } catch {}
      
      // selectedHours 초기화
      try {
        const raw = localStorage.getItem("calendar_selected_hours");
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setSelectedHours(arr.filter((n: unknown) => typeof n === "number"));
        }
      } catch {}
      
      // addClassForm 날짜 초기화
      setAddClassForm(prev => ({
        ...prev,
        date: format(new Date(), "yyyy-MM-dd")
      }));
    };
    load();
    // 초기 데이터 로딩 (강사 데이터 포함)
    loadDb();
    const onFocus = () => {
      load();
      loadDb();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Reload DB dataset when navigating calendar (month/week switch or date page)
  React.useEffect(() => {
    const reload = async () => {
      try {
        const { data, error } = await supabase
          .from("class")
          .select("id,class_date,class_time,capacity,instructor_id");
        if (!error && data) {
          type ClassRowFromDb = { id: string; class_date: string | Date; class_time: string; capacity: number; instructor_id?: string | null };
          const mapped: DemoClass[] = (data as ClassRowFromDb[]).map((row) => ({
            id: row.id,
            date: String(row.class_date),
            time: String(row.class_time).slice(0, 5),
            capacity: Number(row.capacity ?? 0),
            instructorName: row.instructor_id ? (getInstructorName(row.instructor_id)) : "미지정",
            instructorId: row.instructor_id ?? null,
            members: [],
            reservedCount: 0,
            reservations: [],
          }));
          setDemoClasses(mapped);
          try {
            const ids = (data as { id: string }[]).map((r) => r.id);
            if (ids.length > 0) {
              const { data: resv, error: resvErr } = await supabase
                .from("reservation")
                .select("id,class_id,name").in("class_id", ids as string[]);
              if (!resvErr && resv) {
                const counts: Record<string, number> = {};
                const byClass: Record<string, { id: string; name: string; attendance?: "present" | "absent" | null }[]> = {};
                (resv as { id: string; class_id: string; name: string }[]).forEach((r) => {
                  counts[r.class_id] = (counts[r.class_id] ?? 0) + 1;
                  if (!byClass[r.class_id]) byClass[r.class_id] = [];
                  byClass[r.class_id].push({ id: r.id, name: (r.name || "").trim(), attendance: null });
                });
                setDemoClasses((prev) => prev.map((c) => ({
                  ...c,
                  reservedCount: c.id && counts[c.id] ? counts[c.id] : (c.reservedCount ?? 0),
                  reservations: c.id && byClass[c.id] ? byClass[c.id] : [],
                })));
              }
            }
          } catch {}
        }
      } catch {}
    };
    reload();
  }, [view, currentDate]);

  // When instructors are loaded or change, hydrate instructorName on classes
  React.useEffect(() => {
    if (instructors.length === 0) return;
    setDemoClasses((prev) => prev.map((c) => ({
      ...c,
      instructorName: c.instructorId ? getInstructorName(c.instructorId) : c.instructorName,
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructors]);

  // Persist selected hours across sessions (localStorage)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("calendar_selected_hours");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSelectedHours(arr.filter((n: unknown) => typeof n === "number"));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("calendar_selected_hours", JSON.stringify(selectedHours));
    } catch {}
  }, [selectedHours]);

  // Persist enabled weekdays across sessions
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("calendar_enabled_weekdays");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const cleaned = Array.from(
            new Set(
              arr
                .filter((n: unknown) => typeof n === "number")
                .map((n: number) => Math.max(0, Math.min(6, Math.floor(n))))
            )
          ).sort((a, b) => a - b);
          if (cleaned.length > 0) setEnabledWeekdays(cleaned as number[]);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("calendar_enabled_weekdays", JSON.stringify(enabledWeekdays));
    } catch {}
  }, [enabledWeekdays]);

  // Persist view and currentDate
  React.useEffect(() => {
    try {
      localStorage.setItem("calendar_view", view);
    } catch {}
  }, [view]);

  React.useEffect(() => {
    try {
      localStorage.setItem("calendar_current_date_ts", String(currentDate.getTime()));
    } catch {}
  }, [currentDate]);

  const goPrev = () =>
    setCurrentDate((d) => (view === "month" ? subMonths(d, 1) : new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)));
  const goNext = () =>
    setCurrentDate((d) => (view === "month" ? addMonths(d, 1) : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)));
  const goToday = () => setCurrentDate(new Date());

  return (
    <div className={cn("w-full h-full rounded-lg border bg-card text-card-foreground shadow flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {format(currentDate, "yyyy년 M월", { locale: ko })}
        </h2>
        <div className="relative flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={goToday}>
            오늘
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {/* Week filters */}
          {view === "week" && (
            <div className="ml-2 flex items-center gap-2">
              {/* Weekday multi-select dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setShowWeekdayMenu((s) => !s)}
                >
                  요일 선택 {enabledWeekdays.length < 7 ? `(${enabledWeekdays.length})` : "(전체)"}
                </Button>
                <div
                  className={cn(
                    "absolute right-0 z-50 mt-2 w-40 rounded border bg-background p-2 shadow",
                    !showWeekdayMenu && "hidden"
                  )}
                >
                  <div className="max-h-60 overflow-auto pr-1">
                    {weekdayLabels.map((label, idx) => {
                      const checked = enabledWeekdays.includes(idx);
                      return (
                        <label key={label} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted">
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={checked}
                            onChange={() =>
                              setEnabledWeekdays((prev) =>
                                checked ? prev.filter((d) => d !== idx) : [...prev, idx].sort()
                              )
                            }
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setEnabledWeekdays([0, 1, 2, 3, 4, 5, 6])}
                    >
                      전체
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowWeekdayMenu(false)}
                    >
                      닫기
                    </Button>
                  </div>
                </div>
              </div>
              {/* Hour multi-select dropdown */}
              <div className="relative">
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setShowHourMenu((s) => !s)}>
                  시간 선택 {selectedHours.length > 0 ? `(${selectedHours.length})` : "(전체)"}
                </Button>
                <div
                  className={cn(
                    "absolute right-0 z-50 mt-2 w-48 rounded border bg-background p-2 shadow",
                    !showHourMenu && "hidden"
                  )}
                >
                  <div className="max-h-60 overflow-auto pr-1">
                    {allHours.map((h) => {
                      const checked = selectedHours.includes(h);
                      return (
                        <label key={h} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted">
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={checked}
                            onChange={() =>
                              setSelectedHours((prev) =>
                                prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
                              )
                            }
                          />
                          <span>{formatHour(h)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setSelectedHours([])}
                    >
                      전체
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowHourMenu(false)}
                    >
                      닫기
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* View toggle: Week / Month */}
          <div className="ml-2 inline-flex rounded-md border p-0.5 text-xs">
            <button
              className={cn(
                "px-2 py-1 rounded-sm",
                view === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              onClick={() => setView("week")}
            >
              주
            </button>
            <button
              className={cn(
                "px-2 py-1 rounded-sm",
                view === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              onClick={() => setView("month")}
            >
              월
            </button>
          </div>
          {/* Add class button */}
          <Button
            size="icon"
            className="ml-2 rounded-full"
            onClick={() => {
              // 선택된 날짜가 있으면 그 날짜를 기본값으로 설정
              const defaultDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
              setAddClassForm({
                date: defaultDate,
                time: "",
                capacity: "3",
                instructorId: "",
                notes: ""
              });
              setShowAddClassModal(true);
            }}
            aria-label="수업 추가"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === "month" ? (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-px border-t bg-border/60 text-center text-xs font-medium text-muted-foreground">
            {"일,월,화,수,목,금,토".split(",").map((d) => (
              <div key={d} className="bg-muted py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 gap-px bg-border/60">
            {days.map((day) => {
              const outside = !isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
              const dateKey = format(day, "yyyy-MM-dd");
              const dayClasses = demoClasses
                .filter((c) => c.date === dateKey)
                .sort((a, b) => a.time.localeCompare(b.time));
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative min-h-[160px] bg-background p-2 text-left flex flex-col items-start justify-start overflow-hidden",
                    outside && "text-muted-foreground/60",
                    isSelected && "ring-2 ring-primary",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium",
                      isCurrentDay ? "bg-red-500 text-white" : "",
                    )}
                  >
                    {format(day, "d")}
                  </span>

                  {/* day classes: make scrollable to show all */}
                  <div className="mt-2 flex w-full flex-col gap-1 overflow-y-auto max-h-40 md:max-h-56">
                    {dayClasses.map((c, idx) => {
                      const dt = new Date(`${dateKey}T${c.time}:00`);
                      const isPastCard = !isNaN(dt.getTime()) && dt < new Date();
                      return (
                      <div
                        key={`${dateKey}-${c.time}-${idx}`}
                        className={cn(
                          "flex w-full items-start justify-between rounded px-2 py-1 text-[11px] text-white bg-gradient-to-r flex-col gap-2",
                          isPastCard ? "from-blue-300 to-purple-300" : "from-blue-500 to-purple-600"
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums">{c.time}</span>
                            <div
                              className="truncate underline decoration-dotted underline-offset-2 cursor-pointer hover:opacity-80"
                              onClick={(e) => { e.stopPropagation(); if (c.id) { setActiveInstructorEdit({ classId: c.id }); setSelectedInstructorId(c.instructorId || ""); } }}
                              title="강사 변경"
                            >
                              {c.instructorName || "강사 미지정"}
                            </div>
                          </div>
                          <span className="shrink-0">({typeof c.reservedCount==='number'?c.reservedCount:0}/{c.capacity})</span>
                        </div>
                        {/* 월간보기에서는 회원명(예약자) 표시는 숨김 */}
                      </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Week header row with day labels */}
          <div
            className="grid gap-px border-t bg-border/60 text-xs font-medium text-muted-foreground"
            style={{ gridTemplateColumns: `64px repeat(${filteredWeekDays.length}, minmax(0, 1fr))` }}
          >
            <div className="bg-muted py-2 text-center">시간</div>
            {filteredWeekDays.map((d) => {
              const today = isToday(d);
              const isSelectedDay =
                format(d, "yyyy-MM-dd") === (selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className={cn(
                    "bg-muted py-2 text-center",
                    isSelectedDay && "ring-1 ring-primary"
                  )}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className={cn(
                        today
                          ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold"
                          : "text-foreground text-sm font-medium"
                      )}
                    >
                      {format(d, "d", { locale: ko })}
                    </span>
                    <span className="text-xs md:text-sm text-muted-foreground">
                      일 ({format(d, "EEE", { locale: ko })})
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Week time grid: 24h x 7d */}
          <div
            className="flex-1 overflow-auto grid gap-px bg-border/60"
            style={{
              gridTemplateColumns: `64px repeat(${filteredWeekDays.length}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${hours.length}, minmax(48px, 1fr))`,
            }}
          >
            {hours.map((h) => (
              <React.Fragment key={h}>
                <div className="bg-background/80 p-2 text-right text-xs text-muted-foreground h-full">
                  {h}:00
                </div>
                {filteredWeekDays.map((d) => {
                  const today = isToday(d);
                  const dateKey = format(d, "yyyy-MM-dd");
                  const cellClasses = demoClasses.filter(
                    (c) => c.date === dateKey && Number(c.time.split(":")[0]) === h
                  );
                  const isSingleInCell = cellClasses.length === 1;
                  return (
                    <div key={`${d.toISOString()}-${h}`} className={cn("bg-background h-full relative p-1 overflow-y-auto flex flex-col gap-1")}
                    >
                      {cellClasses.map((c, idx) => {
                        const dt = new Date(`${dateKey}T${String(h).padStart(2,"0")}:00:00`);
                        const isPastCard = !isNaN(dt.getTime()) && dt < new Date();
                        return (
                          <div
                            key={`${dateKey}-${h}-${idx}`}
                            className={cn(
                              "rounded-md text-white p-2 text-xs shadow bg-gradient-to-r flex flex-col gap-2",
                              isPastCard ? "from-blue-300 to-purple-300" : "from-blue-500 to-purple-600",
                              isSingleInCell && "h-full justify-between"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className="font-medium underline decoration-dotted underline-offset-2 cursor-pointer hover:opacity-80"
                                onClick={(e) => { e.stopPropagation(); if (c.id) { setActiveInstructorEdit({ classId: c.id }); setSelectedInstructorId(c.instructorId || ""); } }}
                                title="강사 변경"
                              >
                                {c.instructorName || "강사 미지정"}
                              </div>
                              <div className="flex items-center gap-2">
                                <span>({typeof c.reservedCount==='number'?c.reservedCount:0}/{c.capacity})</span>
                                {c.id && (c.reservedCount || 0) > 0 && (
                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleAttendanceCheck(c.id!); 
                                    }}
                                    className="px-2 py-1 text-xs bg-white/20 hover:bg-white/30 rounded text-white"
                                    title="출석 체크"
                                  >
                                    출석
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2"
                            >
                              {(c.reservations ?? []).map((rsv, i) => (
                                <span
                                  key={`${rsv.id}-${i}`}
                                  className="inline-flex w-full items-center justify-center rounded-full bg-white/90 px-2 py-1 text-[11px] text-sky-700 truncate"
                                  title="예약자"
                                >
                                  {rsv.name || "이름없음"}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </>
      )}



      <AttendanceModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        reservations={selectedClassReservations}
        onAttendanceUpdate={handleAttendanceUpdate}
      />

      {activeInstructorEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border bg-background p-4 shadow-lg">
            <div className="text-sm">담당 강사 변경</div>
            <div className="mt-3">
              <select
                className="w-full rounded border bg-background px-2 py-2 text-sm"
                value={selectedInstructorId}
                onChange={(e) => setSelectedInstructorId(e.target.value)}
              >
                <option value="">선택 없음</option>
                {instructors.map((ins) => (
                  <option key={ins.id} value={ins.id}>{ins.name}</option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveInstructorEdit(null)}>취소</Button>
              <Button
                size="sm"
                onClick={async () => {
                  const clsId = activeInstructorEdit.classId;
                  try {
                    await supabase.from("class").update({ instructor_id: selectedInstructorId || null }).eq("id", clsId);
                    setDemoClasses((prev) => prev.map((c) => (
                      c.id === clsId ? { ...c, instructorId: selectedInstructorId || null, instructorName: selectedInstructorId ? getInstructorName(selectedInstructorId) : "미지정" } : c
                    )));
                  } catch {}
                  setActiveInstructorEdit(null);
                }}
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 수업 추가 모달 */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
            <div className="text-lg font-semibold mb-4">수업 추가</div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">날짜</label>
                <input
                  type="date"
                  value={addClassForm.date}
                  onChange={(e) => setAddClassForm({...addClassForm, date: e.target.value})}
                  className="w-full p-2 border rounded text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">시간</label>
                <select
                  value={addClassForm.time}
                  onChange={(e) => setAddClassForm({...addClassForm, time: e.target.value})}
                  className="w-full p-2 border rounded text-sm"
                  required
                >
                  <option value="">시간 선택</option>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0');
                    const time = `${hour}:00`;
                    const displayTime = i < 12 ? `오전 ${hour}:00` : i === 12 ? `오후 ${hour}:00` : `오후 ${hour}:00`;
                    return (
                      <option key={time} value={time}>
                        {displayTime}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">정원</label>
                <select
                  value={addClassForm.capacity}
                  onChange={(e) => setAddClassForm({...addClassForm, capacity: e.target.value})}
                  className="w-full p-2 border rounded text-sm"
                  required
                >
                  <option value="">정원 선택</option>
                  {Array.from({ length: 6 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num}명
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">담당 강사</label>
                <select
                  value={addClassForm.instructorId}
                  onChange={(e) => setAddClassForm({...addClassForm, instructorId: e.target.value})}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="">선택 없음</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">메모</label>
                <textarea
                  value={addClassForm.notes}
                  onChange={(e) => setAddClassForm({...addClassForm, notes: e.target.value})}
                  className="w-full p-2 border rounded text-sm"
                  rows={3}
                  placeholder="수업에 대한 추가 정보를 입력하세요"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAddClassModal(false)}
                disabled={savingClass}
              >
                취소
              </Button>
              <Button
                onClick={handleAddClass}
                disabled={savingClass}
              >
                {savingClass ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppleCalendar;


