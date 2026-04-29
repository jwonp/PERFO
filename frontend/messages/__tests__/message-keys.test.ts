import { describe, expect, it } from 'vitest'
import en from '../en.json'
import ja from '../ja.json'
import ko from '../ko.json'

type MessageTree = Record<string, unknown>

const REQUIRED_KEYS = [
  'common.displayName',
  'common.displayNamePlaceholder',
  'signup.termsAgreement',
  'signup.privacyAgreement',
  'signup.marketingAgreement',
  'myTickets.scanTitle',
  'myTickets.scanDescription',
  'reserved.qrShow',
  'reserved.qrTitle',
]

const getValueByPath = (obj: MessageTree, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') {
      return undefined
    }
    return (acc as MessageTree)[key]
  }, obj)
}

describe('다국어 메시지 키 검증', () => {
  const locales: Array<{ locale: string; messages: MessageTree }> = [
    { locale: 'ko', messages: ko as MessageTree },
    { locale: 'en', messages: en as MessageTree },
    { locale: 'ja', messages: ja as MessageTree },
  ]

  for (const { locale, messages } of locales) {
    it(`${locale} 로케일은 필수 메시지 키를 모두 포함한다`, () => {
      for (const key of REQUIRED_KEYS) {
        expect(getValueByPath(messages, key), `${locale} missing: ${key}`).toBeTypeOf('string')
      }
    })
  }
})
