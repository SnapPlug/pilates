import { cn } from "@/lib/utils"
import Image from "next/image"

interface DeviceFrameProps {

  mobileContent: {
    type: 'image' | 'video' | 'gif'
    src: string
    alt?: string
  }
  desktopContent: {
    type: 'image' | 'video' | 'gif'
    src: string
    alt?: string
  }
  className?: string
}

export function DeviceFrame({ 

  mobileContent,
  desktopContent,
  className 
}: DeviceFrameProps) {
  const renderContent = (content: { type: string; src: string; alt?: string }) => {
    switch (content.type) {
      case 'video':
        return (
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src={content.src} type="video/mp4" />
            <source src={content.src} type="video/webm" />
            <source src={content.src} type="video/ogg" />
          </video>
        )
      case 'gif':
        return (
          <Image
            src={content.src}
            alt={content.alt || "GIF content"}
            fill
            className="object-cover"
          />
        )
      case 'image':
      default:
        return (
          <Image
            src={content.src}
            alt={content.alt || "Image content"}
            fill
            className="object-cover"
          />
        )
    }
  }

  return (
    <section className={cn(
      "text-foreground",
      "py-6 sm:py-12 md:py-16 px-4",
      className
    )}>
      <div className="mx-auto max-w-container">
        <div className="flex flex-col items-center gap-12 text-center">
          <div className="flex flex-col items-center gap-4 sm:gap-8">

          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-2 lg:gap-16 relative">
            {/* 아이폰 프레임 */}
            <div className="relative">
              <div className="relative w-[120px] h-[240px] bg-black rounded-[1.5rem] p-2 shadow-2xl">
                {/* 아이폰 스크린 */}
                <div className="relative w-full h-full bg-black rounded-[1rem] overflow-hidden">
                  {/* 다이나믹 아일랜드 */}
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-10 h-5 bg-black rounded-full z-10 border border-gray-600" />
                  
                  {/* 콘텐츠 영역 */}
                  <div className="relative w-full h-full">
                    {renderContent(mobileContent)}
                  </div>
                </div>
              </div>
            </div>

            {/* 데이터 흐름 애니메이션 - 데스크톱 */}
            <div className="hidden lg:block z-20">
              {/* 데이터 흐름 선 */}
              <div className="relative w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                {/* 흘러가는 데이터 점들 */}
                <div className="absolute inset-0 flex items-center justify-between animate-data-flow">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
                </div>
              </div>
            </div>
            
            {/* 데이터 흐름 애니메이션 - 모바일 */}
            <div className="lg:hidden z-20">
              {/* 데이터 흐름 선 */}
              <div className="relative w-2 h-32 bg-gray-200 rounded-full overflow-hidden">
                {/* 흘러가는 데이터 점들 */}
                <div className="absolute inset-0 flex flex-col items-center justify-between animate-data-flow-vertical">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
                </div>
              </div>
            </div>

            {/* 아이패드 프레임 */}
            <div className="relative">
              <div className="relative w-[400px] h-[300px] bg-black rounded-[1.5rem] p-3 shadow-2xl">
                {/* 아이패드 스크린 */}
                <div className="relative w-full h-full bg-black rounded-[1rem] overflow-hidden">
                  {/* 상단 카메라 */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-600 rounded-full z-10" />
                  
                  {/* 콘텐츠 영역 */}
                  <div className="relative w-full h-full">
                    {renderContent(desktopContent)}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
