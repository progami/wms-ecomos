import { message, notification } from 'antd'
import type { MessageInstance } from 'antd/es/message/interface'
import type { NotificationInstance } from 'antd/es/notification/interface'

// Configure message and notification instances
let messageApi: MessageInstance
let notificationApi: NotificationInstance

export const configureToast = (msgApi: MessageInstance, notifApi: NotificationInstance) => {
  messageApi = msgApi
  notificationApi = notifApi
}

// Simple toast messages (replacement for react-hot-toast)
export const toast = {
  success: (content: string) => {
    if (messageApi) {
      messageApi.success(content)
    } else {
      message.success(content)
    }
  },
  
  error: (content: string) => {
    if (messageApi) {
      messageApi.error(content)
    } else {
      message.error(content)
    }
  },
  
  info: (content: string) => {
    if (messageApi) {
      messageApi.info(content)
    } else {
      message.info(content)
    }
  },
  
  warning: (content: string) => {
    if (messageApi) {
      messageApi.warning(content)
    } else {
      message.warning(content)
    }
  },
  
  loading: (content: string, key?: string) => {
    if (messageApi) {
      return messageApi.loading({ content, key })
    } else {
      return message.loading({ content, key })
    }
  },
  
  // Promise-based toast
  promise: async <T,>(
    promise: Promise<T>,
    msgs: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ): Promise<T> => {
    const key = 'promise-toast'
    toast.loading(msgs.loading, key)
    
    try {
      const result = await promise
      const successMsg = typeof msgs.success === 'function' ? msgs.success(result) : msgs.success
      if (messageApi) {
        messageApi.success({ content: successMsg, key })
      } else {
        message.success({ content: successMsg, key })
      }
      return result
    } catch (error) {
      const errorMsg = typeof msgs.error === 'function' 
        ? msgs.error(error as Error) 
        : msgs.error
      if (messageApi) {
        messageApi.error({ content: errorMsg, key })
      } else {
        message.error({ content: errorMsg, key })
      }
      throw error
    }
  }
}

// More complex notifications
export const notify = {
  success: (title: string, description?: string) => {
    if (notificationApi) {
      notificationApi.success({
        message: title,
        description,
        placement: 'topRight',
      })
    } else {
      notification.success({
        message: title,
        description,
        placement: 'topRight',
      })
    }
  },
  
  error: (title: string, description?: string) => {
    if (notificationApi) {
      notificationApi.error({
        message: title,
        description,
        placement: 'topRight',
      })
    } else {
      notification.error({
        message: title,
        description,
        placement: 'topRight',
      })
    }
  },
  
  info: (title: string, description?: string) => {
    if (notificationApi) {
      notificationApi.info({
        message: title,
        description,
        placement: 'topRight',
      })
    } else {
      notification.info({
        message: title,
        description,
        placement: 'topRight',
      })
    }
  },
  
  warning: (title: string, description?: string) => {
    if (notificationApi) {
      notificationApi.warning({
        message: title,
        description,
        placement: 'topRight',
      })
    } else {
      notification.warning({
        message: title,
        description,
        placement: 'topRight',
      })
    }
  }
}