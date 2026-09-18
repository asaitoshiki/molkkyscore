import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '取得する情報',
    body: [
      '本アプリは、氏名・メールアドレス・位置情報などの個人情報を取得しません。',
      '入力されたメンバー名、試合の記録、練習の記録は、利用者の端末内にのみ保存されます。開発者を含む第三者がこれらを閲覧することはできません。',
      '端末のデータを消去するか、アプリを削除すると、これらの記録も失われます。',
    ],
  },
  {
    title: '広告について',
    body: [
      '本アプリは、Google が提供する広告配信サービス（Google AdMob）を利用しています。',
      '広告配信のため、AdMob が広告識別子などの情報を取得する場合があります。取得される情報と利用目的については、Google の広告に関するポリシーをご確認ください。',
      '広告識別子の利用は、端末の設定から利用者ご自身で制限できます。',
      '広告を非表示にする買い切りの機能を用意しています。購入後は広告の配信そのものを行いません。',
    ],
  },
  {
    title: '購入について',
    body: [
      '広告を非表示にする機能の決済は、App Store または Google Play を通じて行われます。',
      'クレジットカード番号などの決済情報を、本アプリが取得することはありません。',
    ],
  },
  {
    title: '子どもの利用について',
    body: [
      '本アプリは家族で楽しむことを想定しています。保護者の方は、お子さまの利用にあたり本ポリシーをご確認ください。',
    ],
  },
  {
    title: 'お問い合わせ',
    body: ['本ポリシーに関するお問い合わせは、下記までご連絡ください。'],
  },
]

export const PrivacyPolicyPage = () => {
  const navigate = useNavigate()

  return (
    <div className="mx-auto min-h-full max-w-md bg-paper">
      <AppBar
        title="プライバシーポリシー"
        left={
          <button onClick={() => navigate(-1)} aria-label="戻る">
            <Icon name="chevronLeft" size={22} />
          </button>
        }
      />

      <div className="space-y-7 px-5 py-8">
        <p className="text-[13px] text-muted">
          モルックノート（molkkyscore）における、利用者の情報の取り扱いについて定めます。
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title} className="border-t border-rule pt-4">
            <h2 className="mb-3 font-serif text-lg">{section.title}</h2>
            <div className="space-y-2.5 text-[14px] leading-relaxed">
              {section.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>
        ))}

        <p className="rounded border border-dashed border-rule px-4 py-3 text-[13px] text-alert">
          連絡先メールアドレスを記載してください（ストア申請時に必須です）
        </p>

        <p className="text-[11px] text-faint">最終更新日：ストア公開時に記載してください</p>
      </div>
    </div>
  )
}
