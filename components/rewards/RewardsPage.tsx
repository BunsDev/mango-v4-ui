import Select from '@components/forms/Select'
import AcornIcon from '@components/icons/AcornIcon'
import MangoIcon from '@components/icons/MangoIcon'
import RobotIcon from '@components/icons/RobotIcon'
import WhaleIcon from '@components/icons/WhaleIcon'
import Button, { LinkButton } from '@components/shared/Button'
import Modal from '@components/shared/Modal'
import { Disclosure } from '@headlessui/react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
} from '@heroicons/react/20/solid'
// import { useTranslation } from 'next-i18next'
import Image from 'next/image'
import { ReactNode, useState } from 'react'
import Particles from 'react-tsparticles'
import { ModalProps } from 'types/modal'
import Leaderboards from './Leaderboards'

export const tiers = ['Seed', 'Mango', 'Whale', 'Bot']

const RewardsPage = () => {
  //   const { t } = useTranslation(['common', 'rewards'])
  const [showClaim] = useState(true)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [isWhitelisted, setIsWhitelisted] = useState(false)
  const [showLeaderboards, setShowLeaderboards] = useState('')
  return !showLeaderboards ? (
    <>
      <div className="bg-[url('/images/rewards/madlad-tile.png')]">
        <div className="mx-auto flex max-w-[1140px] flex-col items-center p-8 lg:flex-row lg:p-10">
          <div className="mb-6 h-[180px] w-[180px] flex-shrink-0 lg:mr-10 lg:mb-0 lg:h-[220px] lg:w-[220px]">
            <Image
              className="rounded-lg shadow-lg"
              priority
              src="/images/rewards/madlad.png"
              width={260}
              height={260}
              alt="Top Prize"
            />
            {/* <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <Badge
                label="Season 1 – Top Prize!"
                borderColor="var(--bkg-3)"
                fillColor="var(--bkg-3)"
              />
            </div> */}
          </div>
          <div className="flex flex-col items-center lg:items-start">
            <Badge
              label="Season 1"
              borderColor="var(--active)"
              shadowColor="var(--active)"
            />
            {/* <p className="mt-2 bg-gradient-to-b from-th-active to-th-down bg-clip-text font-display text-2xl text-transparent">
              Mango Mints
            </p> */}
            <h1 className="my-2 text-center text-4xl lg:text-left">
              Win amazing prizes every week.
            </h1>
            <p className="mb-4 text-center text-lg leading-snug lg:text-left">
              Earn points by performing actions on Mango. More points equals
              more chances to win.
            </p>
            <LinkButton
              className="text-lg"
              onClick={() => setShowHowItWorks(true)}
            >
              How it Works
            </LinkButton>
          </div>
        </div>
      </div>
      {!showClaim ? (
        <Claim />
      ) : (
        <Season showLeaderboard={setShowLeaderboards} />
      )}
      {showHowItWorks ? (
        <HowItWorksModal
          isOpen={showHowItWorks}
          onClose={() => setShowHowItWorks(false)}
        />
      ) : null}
      {!isWhitelisted ? (
        <WhitelistWalletModal
          isOpen={!isWhitelisted}
          onClose={() => setIsWhitelisted(true)}
        />
      ) : null}
    </>
  ) : (
    <Leaderboards
      leaderboard={showLeaderboards}
      goBack={() => setShowLeaderboards('')}
    />
  )
}

export default RewardsPage

const Season = ({
  showLeaderboard,
}: {
  showLeaderboard: (x: string) => void
}) => {
  const [topAccountsTier, setTopAccountsTier] = useState('Seed')
  return (
    <>
      <div className="flex items-center justify-center bg-th-bkg-3 px-4 py-3">
        <ClockIcon className="mr-2 h-5 w-5 text-th-active" />
        <p className="text-base text-th-fgd-2">
          Season 1 starts in:{' '}
          <span className="font-bold text-th-fgd-1">4 days</span>
        </p>
      </div>
      <div className="mx-auto grid max-w-[1140px] grid-cols-12 gap-4 p-8 lg:gap-6 lg:p-10">
        <div className="col-span-12 lg:col-span-8">
          <h2 className="mb-4">Rewards Tiers</h2>
          <div className="mb-6 space-y-2">
            <RewardsTierCard
              icon={<AcornIcon className="h-8 w-8 text-th-fgd-2" />}
              name="Seed"
              desc="All new participants start here"
              showLeaderboard={showLeaderboard}
              status="Qualified"
            />
            <RewardsTierCard
              icon={<MangoIcon className="h-8 w-8 text-th-fgd-2" />}
              name="Mango"
              desc="Average swap/trade value less than $1,000"
              showLeaderboard={showLeaderboard}
            />
            <RewardsTierCard
              icon={<WhaleIcon className="h-8 w-8 text-th-fgd-2" />}
              name="Whale"
              desc="Average swap/trade value greater than $1,000"
              showLeaderboard={showLeaderboard}
            />
            <RewardsTierCard
              icon={<RobotIcon className="h-8 w-8 text-th-fgd-2" />}
              name="Bot"
              desc="All bots"
              showLeaderboard={showLeaderboard}
            />
          </div>
          <h2 className="mb-4">FAQs</h2>
          <div className="border-b border-th-bkg-3">
            <Disclosure>
              {({ open }) => (
                <>
                  <Disclosure.Button
                    className={`w-full border-t border-th-bkg-3 p-4 text-left focus:outline-none md:hover:bg-th-bkg-2`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-th-fgd-2">FAQ 1</p>
                      <ChevronDownIcon
                        className={`${
                          open ? 'rotate-180' : 'rotate-360'
                        } h-5 w-5 flex-shrink-0`}
                      />
                    </div>
                  </Disclosure.Button>
                  <Disclosure.Panel className="p-4">
                    <p>FAQ 1 content</p>
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <div className="mb-2 rounded-lg border border-th-bkg-3 p-4">
            <h2 className="mb-4">Your Points</h2>
            <div className="mb-4 rounded-md bg-th-bkg-2 p-3">
              <span className="font-display text-3xl text-th-fgd-1">0</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <p>Points Earned</p>
                <p className="font-mono text-th-fgd-2">0</p>
              </div>
              <div className="flex justify-between">
                <p>Streak Bonus</p>
                <p className="font-mono text-th-fgd-2">0x</p>
              </div>
              <div className="flex justify-between">
                <p>Rewards Tier</p>
                <p className="text-th-fgd-2">Seed</p>
              </div>
              <div className="flex justify-between">
                <p>Rank</p>
                <p className="text-th-fgd-2">–</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-th-bkg-3 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="">Top Accounts</h2>
              <Select
                value={topAccountsTier}
                onChange={(tier) => setTopAccountsTier(tier)}
              >
                {tiers.map((tier) => (
                  <Select.Option key={tier} value={tier}>
                    <div className="flex w-full items-center justify-between">
                      {tier}
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div className="border-b border-th-bkg-3">
              <div className="flex items-center justify-between border-t border-th-bkg-3 p-3">
                <div className="flex items-center space-x-2 font-mono">
                  <span>1.</span>
                  <span className="text-th-fgd-3">1a3F...eAu3</span>
                </div>
                <span className="font-mono text-th-fgd-1">0</span>
              </div>
              <div className="flex items-center justify-between border-t border-th-bkg-3 p-3">
                <div className="flex items-center space-x-2 font-mono">
                  <span>2.</span>
                  <span className="text-th-fgd-3">1a3F...eAu3</span>
                </div>
                <span className="font-mono text-th-fgd-1">0</span>
              </div>
              <div className="flex items-center justify-between border-t border-th-bkg-3 p-3">
                <div className="flex items-center space-x-2 font-mono">
                  <span>3.</span>
                  <span className="text-th-fgd-3">1a3F...eAu3</span>
                </div>
                <span className="font-mono text-th-fgd-1">0</span>
              </div>
              <div className="flex items-center justify-between border-t border-th-bkg-3 p-3">
                <div className="flex items-center space-x-2 font-mono">
                  <span>4.</span>
                  <span className="text-th-fgd-3">1a3F...eAu3</span>
                </div>
                <span className="font-mono text-th-fgd-1">0</span>
              </div>
              <div className="flex items-center justify-between border-t border-th-bkg-3 p-3">
                <div className="flex items-center space-x-2 font-mono">
                  <span>5.</span>
                  <span className="text-th-fgd-3">1a3F...eAu3</span>
                </div>
                <span className="font-mono text-th-fgd-1">0</span>
              </div>
            </div>
            <Button className="mt-6 w-full" secondary>
              Full Leaderboard
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

const Claim = () => {
  const [showWinModal, setShowWinModal] = useState(false)
  const [showLossModal, setShowLossModal] = useState(false)
  return (
    <>
      <div className="flex items-center justify-center bg-th-bkg-3 px-4 py-3">
        <ClockIcon className="mr-2 h-5 w-5 text-th-active" />
        <p className="text-base text-th-fgd-2">
          Season 1 claim ends in:{' '}
          <span className="font-bold text-th-fgd-1">24 hours</span>
        </p>
      </div>
      <div className="mx-auto grid max-w-[1140px] grid-cols-12 gap-4 p-8 lg:gap-6 lg:p-10">
        <div className="col-span-12">
          <div className="mb-6 text-center md:mb-12">
            <h2 className="mb-2 text-5xl">Congratulations!</h2>
            <p className="text-lg">You earnt 3 boxes in Season 1</p>
          </div>
          <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-center md:space-x-6 md:space-y-0">
            <div className="flex w-full flex-col items-center rounded-lg border border-th-bkg-3 p-6 md:w-1/3">
              <Image
                className="md:-mt-10"
                src="/images/rewards/cube.png"
                width={140}
                height={140}
                alt="Reward"
                style={{ width: 'auto', maxWidth: '140px' }}
              />
              <Button className="mt-8" size="large">
                Open Box
              </Button>
            </div>
            <div className="flex w-full flex-col items-center rounded-lg border border-th-bkg-3 p-6 md:w-1/3">
              <Image
                className="md:-mt-10"
                src="/images/rewards/cube.png"
                width={140}
                height={140}
                alt="Reward"
                style={{ width: 'auto', maxWidth: '140px' }}
              />
              <Button
                className="mt-8"
                size="large"
                onClick={() => setShowLossModal(true)}
              >
                Open Box
              </Button>
            </div>
            <div className="flex w-full flex-col items-center rounded-lg border border-th-bkg-3 p-6 md:w-1/3">
              <Image
                className="md:-mt-10"
                src="/images/rewards/cube.png"
                width={140}
                height={140}
                alt="Reward"
                style={{ width: 'auto', maxWidth: '140px' }}
              />
              <Button
                className="mt-8"
                onClick={() => setShowWinModal(true)}
                size="large"
              >
                Open Box
              </Button>
            </div>
          </div>
        </div>
      </div>
      {showWinModal ? (
        <ClaimWinModal
          isOpen={showWinModal}
          onClose={() => setShowWinModal(false)}
        />
      ) : null}
      {showLossModal ? (
        <ClaimLossModal
          isOpen={showLossModal}
          onClose={() => setShowLossModal(false)}
        />
      ) : null}
    </>
  )
}

const RewardsTierCard = ({
  desc,
  icon,
  name,
  showLeaderboard,
  status,
}: {
  desc: string
  icon: ReactNode
  name: string
  showLeaderboard: (x: string) => void
  status?: string
}) => {
  return (
    <button
      className="w-full rounded-lg border border-th-bkg-3 p-4 text-left focus:outline-none md:hover:border-th-fgd-4"
      onClick={() => showLeaderboard(name)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-th-bkg-2 to-th-bkg-4">
            {icon}
          </div>
          <div>
            <h3>{name}</h3>
            <p>{desc}</p>
          </div>
        </div>
        <div className="flex items-center pl-4">
          {status ? (
            <Badge
              label={status}
              borderColor="var(--success)"
              shadowColor="var(--success)"
            />
          ) : null}
          <ChevronRightIcon className="ml-4 h-6 w-6 text-th-fgd-3" />
        </div>
      </div>
    </button>
  )
}

export const Badge = ({
  label,
  fillColor,
  shadowColor,
  borderColor,
}: {
  label: string
  fillColor?: string
  shadowColor?: string
  borderColor: string
}) => {
  return (
    <div
      className="w-max rounded-full border px-3 py-1"
      style={{
        background: fillColor ? fillColor : 'transparent',
        borderColor: borderColor,
        boxShadow: shadowColor ? `0px 0px 8px 0px ${shadowColor}` : 'none',
      }}
    >
      <span style={{ color: fillColor ? 'var(--fgd-1)' : borderColor }}>
        {label}
      </span>
    </div>
  )
}

const particleOptions = {
  detectRetina: true,
  emitters: {
    life: {
      count: 60,
      delay: 0,
      duration: 0.1,
    },
    startCount: 0,
    particles: {
      shape: {
        type: ['character', 'character', 'character', 'character', 'character'],
        options: {
          character: [
            {
              fill: true,
              font: 'Verdana',
              value: ['🍀', '🦄', '⭐️', '🎉', '💸'],
              style: '',
              weight: 400,
            },
          ],
        },
      },
      opacity: {
        value: 1,
      },
      rotate: {
        value: {
          min: 0,
          max: 360,
        },
        direction: 'random',
        animation: {
          enable: true,
          speed: 30,
        },
      },
      tilt: {
        direction: 'random',
        enable: true,
        value: {
          min: 0,
          max: 360,
        },
        animation: {
          enable: true,
          speed: 30,
        },
      },
      size: {
        value: 16,
      },
      roll: {
        darken: {
          enable: true,
          value: 25,
        },
        enable: true,
        speed: {
          min: 5,
          max: 15,
        },
      },
      move: {
        angle: 10,
        attract: {
          rotate: {
            x: 600,
            y: 1200,
          },
        },
        direction: 'bottom',
        enable: true,
        speed: { min: 8, max: 16 },
        outMode: 'destroy',
      },
    },
    position: {
      x: { random: true },
      y: 0,
    },
  },
}

const ClaimWinModal = ({ isOpen, onClose }: ModalProps) => {
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="mb-6 text-center">
          <h2 className="mb-6">You&apos;re a winner!</h2>
          <div
            className="mx-auto mb-3 h-48 w-48 rounded-lg border border-th-success"
            style={{
              boxShadow: '0px 0px 8px 0px var(--success)',
            }}
          ></div>
          <p className="text-lg">Prize name goes here</p>
        </div>
        <Button className="w-full" size="large">
          Claim Prize
        </Button>
      </Modal>
      <div className="relative z-50">
        <Particles id="tsparticles" options={particleOptions} />
      </div>
    </>
  )
}

const ClaimLossModal = ({ isOpen, onClose }: ModalProps) => {
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="mb-6 text-center">
          <h2 className="mb-2">Better luck next time</h2>
          <p className="text-lg">This box is empty</p>
        </div>
        <Button className="w-full" onClick={onClose} size="large">
          Close
        </Button>
      </Modal>
    </>
  )
}

const HowItWorksModal = ({ isOpen, onClose }: ModalProps) => {
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        panelClassNames="max-h-[540px] thin-scroll overflow-auto"
      >
        <h2 className="mb-2 text-center" tabIndex={0}>
          How it works
        </h2>
        <p className="mb-4 text-base">
          Mango Mints is a weekly rewards program with amazing prizes. Anyone
          can participate simply by performing actions on Mango.
        </p>
        <ol className="ml-6 mb-6 list-outside list-decimal space-y-2">
          <li>
            Each weekly cycle is called a Season and each Season has two
            periods.
          </li>
          <li>
            This first period is about earning points and runs from midnight
            Sunday UTC to midnight Friday UTC. The second period is allocated to
            claim prizes and runs from midnight Friday UTC to midnight Sunday
            UTC.
          </li>
          <li>
            Points are earned by performing actions on Mango. Actions may
            include trading, swapping, placing orders and other transactions on
            Mango. You&apos;ll know when you earn points but the formula is not
            public.
          </li>
          <li>
            There are 4 rewards tiers. Everyone starts in the Seed tier. After
            your first Season is completed you&apos;ll be promoted to either the
            Mango or Whale tier (depending on the average notional value of your
            swaps/trades). If you miss a Season you&apos;ll be relegated to the
            Seed tier. Bots are automatically assigned to the Bots tier.
          </li>
          <li>
            At the end of each Season Loot Boxes are distributed based on the
            amount of points earned relative to the other participants in your
            tier. Boxes are not guaranteed to contain a prize but the more you
            get, the more chances you have to win a prize.
          </li>
          <li>
            During the claim period you can come back to this page and open your
            loot boxes. Unclaimed prizes will be rolled over to the next Season.
          </li>
          <li>
            Feel free to reach out to us on{' '}
            <a
              href="https://discord.gg/2uwjsBc5yw"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
            </a>{' '}
            with questions.
          </li>
        </ol>
        <Button className="w-full" onClick={onClose} size="large">
          Close
        </Button>
      </Modal>
    </>
  )
}

const WhitelistWalletModal = ({ isOpen, onClose }: ModalProps) => {
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="mb-6 text-center">
          <h2 className="mb-2">Whitelist Wallet</h2>
          <p className="text-lg">
            Wallets are required to be verified with your Discord account to
            participate in Mango Mints. We are doing this as a sybil prevention
            mechanism.
          </p>
        </div>
        <Button className="w-full" onClick={onClose} size="large">
          Whitelist Wallet
        </Button>
      </Modal>
    </>
  )
}
