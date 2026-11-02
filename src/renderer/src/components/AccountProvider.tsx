import React, { useEffect, useState } from 'react'
import { AccountContext, useAccountState } from '../accountStore'

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const account = useAccountState()
  const [toast, setToast] = useState('')
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const show = (event: Event): void => {
      setToast(`Signed in as ${(event as CustomEvent<string>).detail}`)
      clearTimeout(timer)
      timer = setTimeout(() => setToast(''), 4000)
    }
    window.addEventListener('yapin:signin', show)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('yapin:signin', show)
    }
  }, [])
  return (
    <AccountContext.Provider value={account}>
      {children}
      {toast && (
        <div className="auth-bottom-toast" role="status">
          {toast}
        </div>
      )}
    </AccountContext.Provider>
  )
}
