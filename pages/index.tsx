import { toUiDecimals } from '@blockworks-foundation/mango-v4'
import type { NextPage } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useState } from 'react'
import AccountActions from '../components/account/AccountActions'
import DepositModal from '../components/modals/DepositModal'
import WithdrawModal from '../components/modals/WithdrawModal'
import TokenList from '../components/TokenList'
import mangoStore from '../store/state'
import { formatDecimal } from '../utils/numbers'
import FlipNumbers from 'react-flip-numbers'

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'close-account'])),
    },
  }
}

const Index: NextPage = () => {
  const { t } = useTranslation('common')
  const mangoAccount = mangoStore((s) => s.mangoAccount)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  return (
    <>
      <div className="mb-8 flex items-end justify-between border-b border-th-bkg-3 pb-8">
        <div>
          <p className="mb-1">{t('account-value')}</p>
          <div className="flex items-center text-5xl font-bold text-th-fgd-1">
            $
            {mangoAccount ? (
              <FlipNumbers
                height={48}
                width={32}
                play
                delay={0.05}
                duration={1}
                numbers={formatDecimal(
                  toUiDecimals(mangoAccount.getEquity().toNumber()),
                  2
                )}
              />
            ) : (
              (0).toFixed(2)
            )}
          </div>
          {/* <div className="text-5xl font-bold text-th-fgd-1">
            $
            {mangoAccount
              ? formatDecimal(
                  toUiDecimals(mangoAccount.getEquity().toNumber()),
                  2
                )
              : (0).toFixed(2)}
          </div> */}
        </div>
        <AccountActions />
      </div>
      <TokenList />
      {showDepositModal ? (
        <DepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
        />
      ) : null}
      {showWithdrawModal ? (
        <WithdrawModal
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
        />
      ) : null}
    </>
  )
}

export default Index
