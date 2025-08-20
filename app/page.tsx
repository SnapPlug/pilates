import { DrawArrow } from "@/components/ui/drawarrow";
import React from "react"
import { NavigationBar } from "@/components/ui/navigation-bar";
import { TestimonialsSection } from "@/components/blocks/testimonials-with-marquee";
import { DeviceFrame } from "@/components/ui/device-frame";
import { CheckCircle, Users, BarChart3, MessageCircle, Smartphone, Award, Zap, Shield } from "lucide-react";

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

  const features = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "카카오챗봇 연동",
      description: "회원들이 가장 익숙한 카카오톡으로 예약하고 관리할 수 있어 사용자 만족도가 높습니다."
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "앱 설치 불필요",
      description: "별도의 앱 설치 없이 웹브라우저만으로 모든 기능을 사용할 수 있습니다."
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "10년 현업 전문가 참여",
      description: "필라테스 현업에서 10년 이상 경력을 쌓은 전문가와 함께 실제 문제를 발견하고 개선했습니다."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "심플한 기능",
      description: "경쟁사 대비 불필요한 기능 없이 정말 필요한 기능만 담아 심플하게 구성했습니다."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "한눈에 보는 통계",
      description: "매장 운영에 대한 통계와 관리를 한눈에 볼 수 있는 심플한 대시보드를 제공합니다."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "필라테스/PT 특화",
      description: "필라테스와 개인 PT 샵에 최적화된 서비스로 현업에 딱 맞는 솔루션을 제공합니다."
    }
  ];

  const stats = [
    { number: "100+", label: "운영 중인 스튜디오" },
    { number: "10년+", label: "현업 전문가 경력" },
    { number: "0", label: "앱 설치 필요" },
    { number: "24/7", label: "실시간 예약 관리" }
  ];

  return (
    <div className="bg-white">
      {/* 히어로 섹션 */}
      <div className="relative min-h-screen flex flex-col">
        {/* 텍스트 섹션 */}
        <div className="flex-1 flex flex-col items-center justify-center pt-20 pb-10 z-20 relative">
          <div className="text-center max-w-4xl mx-auto px-4">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
              <Award className="w-4 h-4 mr-2" />
              10년 현업 전문가와 함께 만든 필라테스/PT 특화 솔루션
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center text-black mb-6 leading-tight">
              필라테스 스튜디오를 위한
              <br />
              <span className="text-blue-600">가장 심플한</span> 운영 관리
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 text-center mb-8 max-w-2xl mx-auto">
              카카오챗봇으로 회원 예약 관리부터 매장 통계까지.
              <br />
              앱 설치 없이 웹으로 모든 것을 해결하세요.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button className="py-4 px-8 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-lg">
                무료로 시작하기
              </button>
              <button className="py-4 px-8 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:border-gray-400 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500/50 text-lg">
                데모 보기
              </button>
            </div>

            {/* 통계 섹션 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-1">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* DeviceFrame 섹션 */}
        <div className="flex-1 flex items-center justify-center z-10 relative">
          <DeviceFrame
            mobileContent={{
              type: 'image',
              src: '/mobile demo.jpeg',
              alt: '카카오톡 챗봇 예약 화면'
            }}
            desktopContent={{
              type: 'image',
              src: '/desktop demo.png',
              alt: '스튜디오 관리 대시보드'
            }}
          />
        </div>
      </div>

      {/* 주요 장점 섹션 */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              경쟁사 대비 특별한 장점
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              필라테스 현업 전문가와 함께 만든, 정말 필요한 기능만 담은 솔루션
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-black mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 카카오챗봇 특화 섹션 */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
                카카오챗봇으로 만드는
                <br />
                <span className="text-blue-600">특별한 경험</span>
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                회원들이 가장 익숙한 카카오톡을 통해 예약하고 관리할 수 있어 
                사용자 만족도가 높고, 운영 효율성도 크게 향상됩니다.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">앱 설치 없이 카카오톡으로 바로 사용</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">회원들이 가장 익숙한 채널 활용</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">실시간 예약 및 취소 관리</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">전화 문의 감소로 운영 효율성 향상</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8">
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">카</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">SnapPilates 봇</div>
                      <div className="text-xs text-gray-500">방금 전</div>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4 mb-4">
                    <p className="text-gray-800 text-sm">
                      안녕하세요! 🏃‍♀️<br/>
                      오늘 수업 예약하시겠어요?<br/>
                      <br/>
                      📅 8월 20일 (화)<br/>
                      ⏰ 19:00 - 20:00<br/>
                      👩‍🏫 김필라테스 강사<br/>
                      <br/>
                      예약하시려면 "예약"이라고 말씀해주세요!
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-blue-500 text-white rounded-lg py-2 px-4 text-sm font-medium">
                      예약
                    </button>
                    <button className="flex-1 bg-gray-200 text-gray-700 rounded-lg py-2 px-4 text-sm">
                      취소
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 심플한 관리 시스템 섹션 */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              심플하지만 강력한 관리 시스템
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              불필요한 기능은 제거하고, 정말 필요한 기능만 담아 
              누구나 쉽게 사용할 수 있도록 만들었습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-3">회원 관리</h3>
              <p className="text-gray-600">
                회원 정보, 예약 내역, 출석 현황을 한눈에 확인하고 관리할 수 있습니다.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-3">통계 분석</h3>
              <p className="text-gray-600">
                매장 운영에 필요한 모든 통계를 실시간으로 확인하고 분석할 수 있습니다.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-3">예약 관리</h3>
              <p className="text-gray-600">
                카카오챗봇을 통한 자동화된 예약 시스템으로 운영 효율성을 극대화합니다.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* 테스티모니얼 섹션 */}
      <TestimonialsSection
        title="실제 사용 중인 스튜디오 운영자들의 후기"
        description="필라테스 현업에서 10년 이상 경험한 전문가들과 함께 만든 솔루션의 진정한 가치를 확인해보세요"
        testimonials={testimonials}
      />
      
      {/* CTA 섹션 */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            앱 설치 없이, 카카오톡으로 바로 사용할 수 있는 
            필라테스 스튜디오 전용 관리 시스템
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="py-4 px-8 rounded-xl bg-white text-blue-600 font-semibold hover:bg-gray-100 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 text-lg">
              무료 체험 시작하기
            </button>
            <button className="py-4 px-8 rounded-xl border-2 border-white text-white font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 text-lg">
              상담 문의하기
            </button>
          </div>
        </div>
      </section>
      
      {/* 네비게이션 섹션 */}
      <div className="flex w-full h-screen justify-center items-center">
        <NavigationBar />
      </div>
    </div>
  );
}
