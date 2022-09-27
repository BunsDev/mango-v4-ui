import { Serum3Side } from '@blockworks-foundation/mango-v4'
import { IconButton } from '@components/shared/Button'
import SideBadge from '@components/shared/SideBadge'
import TabButtons from '@components/shared/TabButtons'
import Tooltip from '@components/shared/Tooltip'
import {
  LinkIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
} from '@heroicons/react/20/solid'
import { Order } from '@project-serum/serum/lib/market'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import mangoStore from '@store/mangoStore'
import { useTranslation } from 'next-i18next'
import Image from 'next/image'
import { useCallback, useMemo, useState } from 'react'
import { notify } from 'utils/notifications'
import { formatDecimal, formatFixedDecimals } from 'utils/numbers'
import { getJupiterLogosAndInfoForMarket } from 'utils/tokens'
import MarketLogos from './MarketLogos'

const TABS = ['Balances', 'Orders']

const BalanceAndOpenOrders = () => {
  const [selectedTab, setSelectedTab] = useState('Balances')

  return (
    <div className="hide-scroll h-full overflow-y-scroll">
      <div className="sticky top-0 z-10">
        <TabButtons
          activeValue={selectedTab}
          onChange={(tab: string) => setSelectedTab(tab)}
          values={TABS}
          showBorders
        />
      </div>
      {selectedTab === 'Balances' ? <Balances /> : null}
      {selectedTab === 'Orders' ? <OpenOrders /> : null}
    </div>
  )
}

const Balances = () => {
  const { t } = useTranslation('common')
  const mangoAccount = mangoStore((s) => s.mangoAccount.current)
  const spotBalances = mangoStore((s) => s.mangoAccount.spotBalances)
  const group = mangoStore((s) => s.group)
  const jupiterTokens = mangoStore((s) => s.jupiterTokens)

  const banks = useMemo(() => {
    if (group) {
      const rawBanks = Array.from(group?.banksMapByName, ([key, value]) => ({
        key,
        value,
      }))
      const sortedBanks = mangoAccount
        ? rawBanks.sort(
            (a, b) =>
              Math.abs(
                mangoAccount?.getTokenBalanceUi(b.value[0]) *
                  b.value[0].uiPrice!
              ) -
              Math.abs(
                mangoAccount?.getTokenBalanceUi(a.value[0]) *
                  a.value[0].uiPrice!
              )
          )
        : rawBanks

      return mangoAccount
        ? sortedBanks.filter(
            (b) => mangoAccount?.getTokenBalanceUi(b.value[0]) !== 0
          )
        : sortedBanks
    }
    return []
  }, [group, mangoAccount])

  return (
    <table className="min-w-full">
      <thead>
        <tr>
          <th className="bg-th-bkg-1 text-left">{t('token')}</th>
          <th className="bg-th-bkg-1 text-right">{t('balance')}</th>
          <th className="bg-th-bkg-1 text-right">{t('in-orders')}</th>
          <th className="bg-th-bkg-1 text-right">{t('unsettled')}</th>
        </tr>
      </thead>
      <tbody>
        {banks.map(({ key, value }) => {
          const bank = value[0]

          let logoURI
          if (jupiterTokens.length) {
            logoURI = jupiterTokens.find(
              (t) => t.address === bank.mint.toString()
            )!.logoURI
          }

          return (
            <tr key={key} className="text-sm">
              <td>
                <div className="flex items-center">
                  <div className="mr-2.5 flex flex-shrink-0 items-center">
                    {logoURI ? (
                      <Image alt="" width="20" height="20" src={logoURI} />
                    ) : (
                      <QuestionMarkCircleIcon className="h-7 w-7 text-th-fgd-3" />
                    )}
                  </div>
                  <span>{bank.name}</span>
                </div>
              </td>
              <td className="pt-4 text-right font-mono">
                <div>
                  {mangoAccount
                    ? formatDecimal(
                        mangoAccount.getTokenBalanceUi(bank),
                        bank.mintDecimals
                      )
                    : 0}
                </div>
              </td>
              <td className="text-right font-mono">
                {spotBalances[bank.mint.toString()]?.inOrders || 0.0}
              </td>
              <td className="text-right font-mono">
                {spotBalances[bank.mint.toString()]?.unsettled || 0.0}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const OpenOrders = () => {
  const { t } = useTranslation('common')
  const { connected } = useWallet()
  const openOrders = mangoStore((s) => s.mangoAccount.openOrders)
  const jupiterTokens = mangoStore((s) => s.jupiterTokens)

  const handleCancelOrder = useCallback(
    async (o: Order) => {
      const client = mangoStore.getState().client
      const group = mangoStore.getState().group
      const mangoAccount = mangoStore.getState().mangoAccount.current
      const selectedMarket = mangoStore.getState().selectedMarket.current
      const actions = mangoStore.getState().actions

      if (!group || !mangoAccount) return

      try {
        const tx = await client.serum3CancelOrder(
          group,
          mangoAccount,
          selectedMarket!.serumMarketExternal,
          o.side === 'buy' ? Serum3Side.bid : Serum3Side.ask,
          o.orderId
        )
        actions.fetchSerumOpenOrders()
        notify({
          type: 'success',
          title: 'Transaction successful',
          txid: tx,
        })
      } catch (e: any) {
        console.error('Error canceling', e)
        notify({
          title: t('order-error'),
          description: e.message,
          txid: e.txid,
          type: 'error',
        })
      }
    },
    [t]
  )

  return connected ? (
    Object.values(openOrders).flat().length ? (
      <table>
        <thead>
          <tr>
            <th className="text-left">{t('token')}</th>
            <th className="text-right">{t('side')}</th>
            <th className="text-right">{t('size')}</th>
            <th className="text-right">{t('price')}</th>
            <th className="text-right">{t('value')}</th>
            <th className="text-right"></th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(openOrders)
            .map(([marketPk, orders]) => {
              return orders.map((o) => {
                const group = mangoStore.getState().group
                const marketInfo = getJupiterLogosAndInfoForMarket(
                  group!,
                  jupiterTokens,
                  new PublicKey(marketPk)
                )
                return (
                  <tr key={`${o.side}${o.size}${o.price}`} className="my-1 p-2">
                    <td className="flex items-center">
                      <MarketLogos
                        baseURI={marketInfo.baseLogoURI}
                        quoteURI={marketInfo.quoteLogoURI}
                      />
                      {marketInfo.marketName}
                    </td>
                    <td className="text-right">
                      <SideBadge side={o.side} />
                    </td>
                    <td className="text-right">{o.size}</td>
                    <td className="text-right">
                      <span>
                        {o.price}{' '}
                        <span className="text-th-fgd-4">
                          {marketInfo.quoteSymbol}
                        </span>
                      </span>
                    </td>
                    <td className="text-right">
                      {formatFixedDecimals(o.size * o.price, true)}
                    </td>
                    <td>
                      <div className="flex justify-end">
                        <Tooltip content={t('cancel')}>
                          <IconButton
                            onClick={() => handleCancelOrder(o)}
                            size="small"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                )
              })
            })
            .flat()}
        </tbody>
      </table>
    ) : (
      <div className="flex flex-col items-center p-8">
        <p>No open orders...</p>
      </div>
    )
  ) : (
    <div className="flex flex-col items-center p-8">
      <LinkIcon className="mb-2 h-6 w-6 text-th-fgd-4" />
      <p>Connect to view your open orders</p>
    </div>
  )
}

export default BalanceAndOpenOrders
