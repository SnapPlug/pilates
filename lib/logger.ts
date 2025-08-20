/**
 * 표준 로깅 유틸리티
 * 클라이언트/서버 공통으로 사용 가능한 로깅 헬퍼를 제공합니다.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  debugId: string;
  context: string;
  state?: string;
  extra?: Record<string, any>;
}

export interface LogErrorContext extends LogContext {
  error: Error;
  message?: string;
}

/**
 * 로그 레벨별 출력 함수
 */
function logWithLevel(level: LogLevel, context: LogContext, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level: level.toUpperCase(),
    debugId: context.debugId,
    context: context.context,
    state: context.state,
    message,
    ...(data && { data }),
    ...(context.extra && { extra: context.extra })
  };

  const logMessage = `[${level.toUpperCase()}][debugId=${context.debugId}] [${context.context}] ${context.state ? `state=${context.state}` : ''} ${message}`;

  switch (level) {
    case 'debug':
      console.debug(logMessage, logData);
      break;
    case 'info':
      console.info(logMessage, logData);
      break;
    case 'warn':
      console.warn(logMessage, logData);
      break;
    case 'error':
      console.error(logMessage, logData);
      break;
  }
}

/**
 * 디버그 로그를 출력합니다
 */
export function logDebug(context: LogContext, message: string, data?: any) {
  logWithLevel('debug', context, message, data);
}

/**
 * 정보 로그를 출력합니다
 */
export function logInfo(context: LogContext, message: string, data?: any) {
  logWithLevel('info', context, message, data);
}

/**
 * 경고 로그를 출력합니다
 */
export function logWarn(context: LogContext, message: string, data?: any) {
  logWithLevel('warn', context, message, data);
}

/**
 * 오류 로그를 출력합니다
 */
export function logError(context: LogErrorContext) {
  const { error, message, ...logContext } = context;
  
  logWithLevel('error', logContext, message || error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    }
  });
}

/**
 * 디버그 ID를 생성합니다
 */
export function generateDebugId(): string {
  return crypto.randomUUID();
}

/**
 * 컨텍스트를 생성합니다
 */
export function createLogContext(componentName: string, functionName?: string): LogContext {
  return {
    debugId: generateDebugId(),
    context: functionName ? `${componentName}#${functionName}` : componentName
  };
}

/**
 * API 응답용 오류 메시지를 생성합니다
 */
export function createApiErrorMessage(debugId: string, userMessage: string = '작업을 완료할 수 없습니다. 잠시 후 다시 시도해주세요.') {
  return {
    message: userMessage,
    debugId
  };
}
