import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from '../page'
import { signOut } from 'next-auth/react'

const setPreference = vi.fn()
const update = vi.fn()
const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      title: '유저 정보',
      appSettings: 'APP SETTINGS',
      darkMode: '다크 모드 설정',
      pushNotification: '푸시 알림 설정',
      support: 'SUPPORT',
      customerSupport: '고객 문의',
      privacyPolicy: 'Privacy Policy',
      logout: '로그아웃',
      editProfile: '프로필 편집',
      editSheetTitle: '프로필 편집',
      displayNameLabel: '닉네임',
      displayNamePlaceholder: '닉네임을 입력하세요',
      displayNameCounter: '{current}/{max}',
      cancel: '취소',
      save: '저장',
      saving: '저장 중...',
      validationDisplayNameMin: '닉네임은 2자 이상이어야 합니다.',
      validationDisplayNameMax: '닉네임은 20자 이하여야 합니다.',
      validationDisplayNameControl: '줄바꿈과 제어 문자는 사용할 수 없습니다.',
      saveSuccess: '프로필이 저장되었습니다.',
      imageUploadTodo: 'JPG, PNG, WEBP만 업로드할 수 있습니다.',
      uploadImageLabel: '이미지 업로드',
      uploadImageHint: '최대 2MB',
      uploadingImage: '업로드 중...',
      uploadSuccess: '프로필 이미지가 저장되었습니다.',
    }
    return messages[key]?.replace('{current}', '3').replace('{max}', '20') ?? key
  },
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: '1',
        name: '홍길동',
        email: 'hong@example.com',
        image: null,
        profileImageType: 'PRESET',
        profileImageValue: 'avatar-blue',
      },
    },
    update,
  }),
  signOut: vi.fn(),
}))

vi.mock('@/components/push/PushNotification', () => ({
  PushNotification: ({ children }: { children: (state: typeof pushState) => React.ReactNode }) => (
    <>{children(pushState)}</>
  ),
}))

vi.mock('@/components/notifications/NotificationButton', () => ({
  NotificationButton: () => <div>NotificationButton</div>,
}))

vi.mock('@/components/providers/ThemeProvider', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setPreference,
  }),
}))

describe('ProfilePage logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pushState.isSupported = true
    pushState.isSubscribed = false
    pushState.isLoading = false
    pushState.error = null
    pushState.subscribe.mockClear()
    pushState.unsubscribe.mockClear()
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        email: 'hong@example.com',
        displayName: '홍길동',
        profileImageType: 'PRESET',
        profileImageValue: 'avatar-blue',
        profileImageUrl: null,
        updatedAt: '2026-04-29T12:00:00',
      }),
    })
  })

  it('renders the current user and a logout action', async () => {
    render(<ProfilePage />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/users/me', expect.objectContaining({ method: 'GET', cache: 'no-store' })))

    expect(screen.getByRole('heading', { name: '유저 정보' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '홍길동' })).toBeInTheDocument()
    expect(screen.getByText('ID: hong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
  })

  it('logs out to the login page', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' })
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('connects the dark mode toggle to the app theme state', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    await user.click(screen.getByRole('switch', { name: /다크 모드 설정/i }))

    expect(setPreference).toHaveBeenCalledWith('dark')
    expect(setPreference).toHaveBeenCalledTimes(1)
  })

  it('opens the edit sheet from the pencil button', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: '프로필 편집' }))

    expect(screen.getByRole('heading', { name: '프로필 편집' })).toBeInTheDocument()
    expect(screen.getByLabelText('닉네임')).toHaveValue('홍길동')
  })

  it('connects the push notification toggle to subscribe action', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    await user.click(screen.getByRole('switch', { name: /푸시 알림 설정/i }))

    expect(pushState.subscribe).toHaveBeenCalledTimes(1)
  })

  it('saves a new nickname and updates the profile immediately', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: 'hong@example.com',
          displayName: '홍길동',
          profileImageType: 'PRESET',
          profileImageValue: 'avatar-blue',
          profileImageUrl: null,
          updatedAt: '2026-04-29T12:00:00',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: 'hong@example.com',
          displayName: '새 닉네임',
          profileImageType: 'PRESET',
          profileImageValue: 'avatar-blue',
          profileImageUrl: null,
          updatedAt: '2026-04-29T12:30:00',
        }),
      })

    render(<ProfilePage />)

    await user.click(screen.getByRole('button', { name: '프로필 편집' }))
    await user.clear(screen.getByLabelText('닉네임'))
    await user.type(screen.getByLabelText('닉네임'), '새 닉네임')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/users/me/profile', expect.objectContaining({ method: 'PATCH' })))
    await waitFor(() => expect(screen.getByRole('heading', { name: '새 닉네임' })).toBeInTheDocument())
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      name: '새 닉네임',
      image: null,
      profileImageType: 'PRESET',
      profileImageValue: 'avatar-blue',
    }))
  })

  it('uploads a profile image and updates the avatar immediately', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: 'hong@example.com',
          displayName: '홍길동',
          profileImageType: 'PRESET',
          profileImageValue: 'avatar-blue',
          profileImageUrl: null,
          updatedAt: '2026-04-29T12:00:00',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          email: 'hong@example.com',
          displayName: '홍길동',
          profileImageType: 'UPLOADED',
          profileImageValue: '1/avatar.png',
          profileImageUrl: '/api/users/me/profile-image?v=2026-04-29T13%3A00%3A00',
          updatedAt: '2026-04-29T13:00:00',
        }),
      })

    render(<ProfilePage />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: '프로필 편집' }))
    const file = new File(['png'], 'avatar.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('이미지 업로드'), file)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/users/me/profile-image', expect.objectContaining({ method: 'POST' })))
    await waitFor(() => expect(screen.getByText('프로필 이미지가 저장되었습니다.')).toBeInTheDocument())
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      image: '/api/users/me/profile-image?v=2026-04-29T13%3A00%3A00',
      profileImageType: 'UPLOADED',
      profileImageValue: '1/avatar.png',
    }))
  })
})
const pushState = {
  isSupported: true,
  isSubscribed: false,
  isLoading: false,
  error: null as string | null,
  subscribe: vi.fn(async () => undefined),
  unsubscribe: vi.fn(async () => undefined),
}
