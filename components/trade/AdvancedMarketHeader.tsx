import { Serum3Market, PerpMarket } from '@blockworks-foundation/mango-v4'
import Change from '@components/shared/Change'
import TabUnderline from '@components/shared/TabUnderline'
import { Popover } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import mangoStore from '@store/mangoStore'
import { group } from 'console'
import { useTranslation } from 'next-i18next'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_MARKET_NAME } from 'utils/constants'
import { formatFixedDecimals } from 'utils/numbers'
import MarketLogos from './MarketLogos'

const MarketSelectDropdown = () => {
  const selectedMarket = mangoStore((s) => s.selectedMarket.current)
  const serumMarkets = mangoStore((s) => s.serumMarkets)
  const perpMarkets = mangoStore((s) => s.perpMarkets)
  const set = mangoStore((s) => s.set)
  const [activeTab, setActiveTab] = useState('perp')

  const handleSelectMarket = useCallback(
    (market: Serum3Market | PerpMarket, close: any) => {
      set((s) => {
        s.selectedMarket.current = market
      })
      close()
    },
    [set]
  )

  return (
    <Popover>
      {({ close, open }) => (
        <div
          className="relative flex flex-col overflow-visible"
          id="trade-step-one"
        >
          <Popover.Button className="default-transition flex w-full items-center justify-between hover:text-th-primary">
            <>
              {selectedMarket ? <MarketLogos market={selectedMarket} /> : null}
            </>
            <div className="text-xl font-bold text-th-fgd-1 md:text-base">
              {selectedMarket?.name || DEFAULT_MARKET_NAME}
            </div>
            <ChevronDownIcon
              className={`${
                open ? 'rotate-180' : 'rotate-360'
              } mt-0.5 ml-2 h-6 w-6 flex-shrink-0 text-th-fgd-3`}
            />
          </Popover.Button>
          <Popover.Panel className="absolute -left-5 top-[46px] z-50 mr-4 w-screen bg-th-bkg-2 pb-2 pt-4 sm:w-56 md:top-[37px]">
            <TabUnderline
              activeValue={activeTab}
              onChange={(v) => setActiveTab(v)}
              small
              values={['perp', 'spot']}
            />
            {activeTab === 'spot'
              ? serumMarkets?.length
                ? serumMarkets.map((m) => {
                    return (
                      <div
                        key={m.publicKey.toString()}
                        className="default-transition flex items-center py-2 px-4 hover:cursor-pointer hover:bg-th-bkg-2"
                        onClick={() => handleSelectMarket(m, close)}
                      >
                        <MarketLogos market={m} />
                        <span
                          className={
                            m.name === selectedMarket?.name
                              ? 'text-th-primary'
                              : ''
                          }
                        >
                          {m.name}
                        </span>
                      </div>
                    )
                  })
                : null
              : null}
            {activeTab === 'perp'
              ? perpMarkets?.length
                ? perpMarkets.map((m) => {
                    return (
                      <div
                        key={m.publicKey.toString()}
                        className="default-transition flex items-center py-2 px-4 hover:cursor-pointer hover:bg-th-bkg-2"
                        onClick={() => handleSelectMarket(m, close)}
                      >
                        <MarketLogos market={m} />
                        <span
                          className={
                            m.name === selectedMarket?.name
                              ? 'text-th-primary'
                              : ''
                          }
                        >
                          {m.name}
                        </span>
                      </div>
                    )
                  })
                : null
              : null}
          </Popover.Panel>
        </div>
      )}
    </Popover>
  )
}

const OraclePrice = () => {
  const group = mangoStore((s) => s.group)
  const selectedMarket = mangoStore((s) => s.selectedMarket.current)

  if (!group || !selectedMarket) return null

  let price
  if (selectedMarket instanceof Serum3Market) {
    price = group.getFirstBankByTokenIndex(
      selectedMarket?.baseTokenIndex
    ).uiPrice
  } else {
    price = selectedMarket.uiPrice
  }

  return (
    <div className="font-mono text-xs text-th-fgd-2">
      ${price ? formatFixedDecimals(price) : null}
    </div>
  )
}

const AdvancedMarketHeader = () => {
  const { t } = useTranslation(['common', 'trade'])
  const selectedMarket = mangoStore((s) => s.selectedMarket.current)
  const serumMarketPrices = mangoStore((s) => s.serumMarketPrices.data)

  const marketPrices = useMemo(() => {
    if (selectedMarket instanceof Serum3Market) {
      const prices = serumMarketPrices.find(
        (m) =>
          m.length &&
          m[0].address === selectedMarket.serumMarketExternal.toString()
      )
      return prices
    }
    // need to handle perp
  }, [selectedMarket])

  const change = useMemo(() => {
    if (marketPrices) {
      return (
        ((marketPrices[marketPrices.length - 1].value - marketPrices[0].value) /
          marketPrices[0].value) *
        100
      )
    }
    return 0
  }, [marketPrices])

  return (
    <div className="flex h-16 items-center bg-th-bkg-1 px-5 md:h-12">
      <div className="md:pr-6 lg:pb-0">
        <div className="flex items-center">
          <MarketSelectDropdown />
        </div>
      </div>
      <div id="trade-step-two" className="ml-6 flex-col">
        <div className="text-xs text-th-fgd-4">{t('trade:oracle-price')}</div>
        <OraclePrice />
      </div>
      <div className="ml-6 flex-col">
        <div className="text-xs text-th-fgd-4">{t('rolling-change')}</div>
        {change ? (
          <Change change={change} size="small" />
        ) : (
          <div className="font-mono text-xs">{t('unavailable')}</div>
        )}
      </div>
    </div>
  )
}

export default AdvancedMarketHeader
