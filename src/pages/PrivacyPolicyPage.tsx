import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '取得する情報',
    body: [
      '本アプリは、氏名・メールアドレス・位置情報などの個人情報を取得しません。',
      '入力されたメンバー名、試合の記録、練習の記録は、利用者の端末内に保存されます。下記「観戦の共有について」「本部で運営する大会について」の機能を使った場合を除き、端末の外へ送信することはありません。',
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
    title: '観戦の共有について',
    body: [
      'アプリ版で「観戦してもらう」を使ったときに限り、その試合のチーム名、出場したメンバーの名前、投球の記録を、Google が提供する Firebase のデータベースへ送信します。共有を使わなければ、何も送信しません。',
      '送信した記録は、観戦用のリンク（QR コード）を知っている人だけが閲覧できます。リンクには推測できないランダムな文字列を使っています。',
      '最後の投球から 12 時間を過ぎると観戦できなくなり、送信した記録は次にアプリを開いたときに削除します。「観戦をやめる」を押した場合は、その場で削除します。',
      '共有した人を区別するため、Firebase が発行する匿名の識別子を使います。氏名やメールアドレスとは結び付きません。',
    ],
  },
  {
    title: '本部で運営する大会について',
    body: [
      '本部で開いた大会に参加したときに限り、その大会の試合のチーム名、出場したメンバーの名前、投球の記録を Firebase のデータベースへ送信し、大会の本部が閲覧できるようにします。参加しなければ、何も送信しません。',
      '送信した記録は、大会の QR コード（リンク）を知っている人が閲覧できます。承認や差し戻しができるのは、大会を開いた端末だけです。',
      '大会を開いてから 7 日を過ぎると、記録の送信や変更はできなくなります。記録の削除を希望する場合は、下記のお問い合わせ先までご連絡ください。',
    ],
  },
  {
    title: '外部サイトへのリンクについて',
    body: [
      '本アプリの一部のページには、広告またはアフィリエイトプログラムによる外部サイトへのリンクを掲載しています。該当箇所には「広告」と明示しています。',
      'リンク先で取得される情報の取り扱いは、各サイトの定めに従います。本アプリがリンク先での行動を追跡することはありません。',
      'リンク先での購入等により、開発者が紹介料を受け取る場合があります。',
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
          モルメモにおける、利用者の情報の取り扱いについて定めます。
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
