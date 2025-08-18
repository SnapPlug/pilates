import { DrawArrow } from "@/components/ui/drawarrow";
import React from "react"
import { NavigationBar } from "@/components/ui/navigation-bar";
import { TestimonialsSection } from "@/components/blocks/testimonials-with-marquee";
import { DeviceFrame } from "@/components/ui/device-frame";

export default function Page() {
  const testimonials = [
    {
      author: {
        name: "김필라테스",
        handle: "필라테스 강사",
        avatar: "/SnapPlug Logo.png"
      },
      text: "카카오톡으로 예약 관리하니 정말 편해요! 회원들이 쉽게 예약하고 취소할 수 있어서 만족도가 높아졌습니다.",
      href: "#"
    },
    {
      author: {
        name: "이요가",
        handle: "요가 스튜디오 운영자",
        avatar: "/SnapPlug Logo.png"
      },
      text: "복잡한 관리 시스템 없이도 효율적으로 운영할 수 있어요. 특히 회원권 관리가 훨씬 간편해졌습니다.",
      href: "#"
    },
    {
      author: {
        name: "박피트니스",
        handle: "피트니스 센터 매니저",
        avatar: "/SnapPlug Logo.png"
      },
      text: "회원들이 카카오톡으로 바로 예약하고 확인할 수 있어서 전화 문의가 줄어들었어요. 운영 효율성이 크게 향상되었습니다.",
      href: "#"
    },
    {
      author: {
        name: "최헬스",
        handle: "헬스클럽 대표",
        avatar: "/SnapPlug Logo.png"
      },
      text: "간단하고 직관적인 인터페이스가 마음에 들어요. 기술에 익숙하지 않은 직원들도 쉽게 사용할 수 있습니다.",
      href: "#"
    },
    {
      author: {
        name: "정웰빙",
        handle: "웰빙센터 운영자",
        avatar: "/SnapPlug Logo.png"
      },
      text: "회원권 상태와 예약 현황을 실시간으로 확인할 수 있어서 관리가 훨씬 수월해졌어요. 정말 추천합니다!",
      href: "#"
    }
  ];

  return (
    <div>
      {/* 히어로 섹션 - 텍스트와 DeviceFrame */}
      <div className="relative min-h-screen flex flex-col">
        {/* 텍스트 섹션 */}
        <div className="flex-1 flex flex-col items-center justify-center pt-20 pb-10 z-20 relative">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center px-4 text-black mb-6">
              가장 익숙한 채널로, 가장 간편한 운영을
            </h1>
            <p className="text-base sm:text-lg text-gray-600 text-center px-4 max-w-xl mb-8">
              카카오톡·네이버톡톡 기반의 가볍고 빠른 스튜디오 운영관리 솔루션
            </p>
            <button className="py-3 px-8 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-black/50">
              시작하기
            </button>
          </div>
        </div>
        
        {/* DeviceFrame 섹션 */}
        <div className="flex-1 flex items-center justify-center z-10 relative">
          <DeviceFrame
            mobileContent={{
              type: 'image',
              src: '/mobile demo.jpeg',
              alt: '아이폰 카카오톡 챗봇 화면'
            }}
            desktopContent={{
              type: 'image',
              src: '/desktop demo.png',
              alt: '아이패드 관리자 페이지 화면'
            }}
          />
        </div>
      </div>
      
      {/* 테스티모니얼 섹션 */}
      <TestimonialsSection
        title="고객들의 생생한 후기"
        description="실제 사용 중인 스튜디오 운영자들의 솔직한 후기를 들어보세요"
        testimonials={testimonials}
      />
      
      {/* 네비게이션 섹션 */}
      <div className="flex w-full h-screen justify-center items-center">
        <NavigationBar />
      </div>
    </div>
  );
}
