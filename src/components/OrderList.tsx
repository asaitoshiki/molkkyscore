import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Numeral } from "./ui";

/** つまんでいる行。離すまで並びそのものは変えず、見た目だけ動かす */
type Drag = {
  from: number;
  /** つまんだときのポインタの位置 */
  startY: number;
  /** つまんでから動いた量 */
  offset: number;
  /** つまんだ時点の各行の上端 */
  tops: number[];
};

/** 1 行ぶんの高さ。行の高さはそろっているので、上端の間隔から求める */
const pitchOf = ({ tops }: Drag) =>
  (tops[tops.length - 1] - tops[0]) / (tops.length - 1);

/** つまんだ行の中心がどの行の位置にあるか。そこが離したときの行き先になる */
const targetOf = (drag: Drag) => {
  const center = drag.tops[drag.from] + drag.offset + pitchOf(drag) / 2;
  return Math.max(drag.tops.filter((top) => top <= center).length - 1, 0);
};

/** 各行がいま見た目上どの位置にいるか。よけた行は 1 つずれる */
const slotOf = (index: number, drag: Drag, to: number) => {
  if (index === drag.from) return to;
  if (drag.from < index && index <= to) return index - 1;
  if (to <= index && index < drag.from) return index + 1;
  return index;
};

/**
 * つまんで上下に動かせる並べ替えリスト。
 * つまんだ行は指についてきて、ほかの行はよけるように滑る。
 * 指でもマウスでも同じ操作になるよう、ポインタイベントだけで組み立てている。
 */
export const OrderList = ({
  items,
  onMove,
}: {
  items: string[];
  onMove: (from: number, to: number) => void;
}) => {
  const rowRefs = useRef<HTMLLIElement[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  // 離した行を、指の位置から新しい場所へ滑り込ませるための記録
  const landing = useRef<{ index: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const land = landing.current;
    if (land === null) return;
    landing.current = null;
    const row = rowRefs.current[land.index];
    const delta = land.top - row.getBoundingClientRect().top;
    row.animate(
      [{ transform: `translateY(${delta}px)` }, { transform: "none" }],
      {
        duration: 160,
        easing: "ease-out",
      },
    );
  }, [drag]);

  const grab = (index: number, clientY: number) =>
    setDrag({
      from: index,
      startY: clientY,
      offset: 0,
      tops: rowRefs.current.map((row) => row.offsetTop),
    });

  const follow = (clientY: number) => {
    if (drag === null) return;
    // リストの外までは持っていかせない
    const min = drag.tops[0] - drag.tops[drag.from];
    const max = drag.tops[drag.tops.length - 1] - drag.tops[drag.from];
    setDrag({
      ...drag,
      offset: Math.min(Math.max(clientY - drag.startY, min), max),
    });
  };

  const release = () => {
    if (drag === null) return;
    const to = targetOf(drag);
    landing.current = {
      index: to,
      top: rowRefs.current[drag.from].getBoundingClientRect().top,
    };
    onMove(drag.from, to);
    setDrag(null);
  };

  const to = drag === null ? null : targetOf(drag);

  return (
    <ul className="relative select-none divide-y divide-rule border-y border-rule">
      {items.map((item, index) => {
        const lifted = drag !== null && drag.from === index;
        const slot = drag === null ? index : slotOf(index, drag, to!);
        // 並べ替え中だけ位置をずらす。離した瞬間は動きを付けずに元の並びへ戻す
        const shift =
          drag === null
            ? 0
            : lifted
              ? drag.offset
              : (slot - index) * pitchOf(drag);
        return (
          <li
            // 離すまで並びは変わらず、離したら位置で入れ替えるので、位置を鍵にする
            key={index}
            ref={(row) => {
              rowRefs.current[index] = row!;
            }}
            style={
              drag === null
                ? undefined
                : { transform: `translateY(${shift}px)` }
            }
            className={`flex items-center gap-3 bg-paper px-1 py-3 ${
              lifted
                ? "relative z-10 bg-surface shadow-[0_6px_18px_rgba(21,25,26,0.14)]"
                : drag === null
                  ? ""
                  : "transition-transform duration-150 ease-out"
            }`}
          >
            <Numeral className="w-6 text-center text-[15px] text-muted">
              {slot + 1}
            </Numeral>
            <span className="flex-1 truncate text-[15px]">{item}</span>
            <button
              aria-label={`${item} を並べ替える`}
              className={`touch-none px-2 py-1 ${lifted ? "cursor-grabbing text-accent" : "cursor-grab text-faint"}`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                grab(index, event.clientY);
              }}
              onPointerMove={(event) => follow(event.clientY)}
              onPointerUp={release}
              onPointerCancel={release}
            >
              <Icon name="grip" size={20} />
            </button>
          </li>
        );
      })}
    </ul>
  );
};
