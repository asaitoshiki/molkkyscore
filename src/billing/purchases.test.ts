import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
}))

const callbacks = {
  productUpdated: vi.fn().mockReturnThis(),
  approved: vi.fn().mockReturnThis(),
  finished: vi.fn().mockReturnThis(),
  receiptsReady: vi.fn().mockReturnThis(),
}

const store = {
  register: vi.fn(),
  when: () => callbacks,
  initialize: vi.fn().mockResolvedValue([]),
  checkSupport: vi.fn().mockReturnValue(true),
  owned: vi.fn().mockReturnValue(false),
  get: vi.fn(),
  order: vi.fn(),
  restorePurchases: vi.fn(),
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  store.owned.mockReturnValue(false)
  store.get.mockReturnValue(undefined)
  vi.stubGlobal('CdvPurchase', {
    store,
    Platform: { GOOGLE_PLAY: 'android-playstore' },
    ProductType: { NON_CONSUMABLE: 'non consumable' },
    ErrorCode: { PAYMENT_CANCELLED: 1 },
  })
  const events = new EventTarget()
  vi.stubGlobal('document', events)
})

afterEach(() => vi.unstubAllGlobals())

const startBilling = async () => {
  const billing = await import('./purchases')
  const started = billing.initializePurchases()
  expect(store.initialize).not.toHaveBeenCalled()
  document.dispatchEvent(new Event('deviceready'))
  await started
  return billing
}

describe('広告除去の課金', () => {
  it('Google Play の価格が届いてから買い切り商品を注文できる', async () => {
    const billing = await startBilling()
    expect(billing.getPurchaseOptions()).toEqual({ ready: true, price: undefined })
    await billing.purchaseAdFree()
    expect(store.order).not.toHaveBeenCalled()
    expect(store.register).toHaveBeenCalledWith([
      { id: 'molkkyscore.adfree', type: 'non consumable', platform: 'android-playstore' },
    ])

    const offer = { pricingPhases: [{ price: '€4.99' }] }
    store.get.mockReturnValue({ getOffer: () => offer })
    const listener = vi.fn()
    const unsubscribe = billing.subscribePurchaseOptions(listener)
    callbacks.productUpdated.mock.calls[0]![0]()
    expect(listener).toHaveBeenCalledOnce()
    expect(billing.getPurchaseOptions().price).toBe('€4.99')
    store.order.mockResolvedValue({ code: 1 })
    expect(await billing.purchaseAdFree()).toBeNull()
    expect(store.order).toHaveBeenCalledWith(offer)
    unsubscribe()
  })

  it('照会失敗時は購入済みの状態を維持し、復元に成功したときに反映する', async () => {
    const billing = await startBilling()
    const { useAppStore: currentStore } = await import('../store/useAppStore')
    currentStore.getState().setAdFree(true)
    store.restorePurchases.mockResolvedValueOnce({ code: 2 })
    expect(await billing.restoreAdFree()).toBeTruthy()
    expect(currentStore.getState().adFree).toBe(true)

    store.restorePurchases.mockResolvedValue(undefined)
    expect(await billing.restoreAdFree()).toBeTruthy()
    expect(currentStore.getState().adFree).toBe(false)

    store.owned.mockReturnValue(true)
    expect(await billing.restoreAdFree()).toBeNull()
    expect(currentStore.getState().adFree).toBe(true)
  })
})
