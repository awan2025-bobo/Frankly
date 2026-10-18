// The full recipe page: price breakdown, store comparison, swaps, ingredients, steps.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, F, R } from '@/lib/theme';
import type { HelpTurn } from '@/lib/api';
import type { Item, RecipeData } from '@/lib/types';
import { StepHelper } from './StepHelper';
import { Body, Card, H1, H2, H3, Label, Muted, Pill, Sheet, money, type IconName } from './ui';

/** helperRecipeId: when set, step numbers open the Frankly helper (on every recipe screen). */
export function RecipeView({ data, helperRecipeId }: { data: RecipeData; helperRecipeId?: string }) {
  const [applied, setApplied] = useState<string[]>([]);
  const [where, setWhere] = useState<Item | null>(null);
  const [help, setHelp] = useState<{ index: number; anchor: { y: number; h: number } } | null>(null);
  const [chats, setChats] = useState<Record<number, HelpTurn[]>>({});
  const stepRefs = useRef<(View | null)[]>([]);

  const openHelp = (index: number) =>
    stepRefs.current[index]?.measureInWindow((_x, y, _w, h) => setHelp({ index, anchor: { y, h } }));

  const bestId = data.recommended.locationId;
  const best = data.totals.find((t) => t.locationId === bestId) ?? null;
  const bestStore = data.stores.find((s) => s.locationId === bestId);
  const swaps = data.items.filter((i) => i.swap);
  const savings = swaps.filter((i) => applied.includes(i.name)).reduce((sum, i) => sum + (i.swap?.savings ?? 0), 0);
  const total = (best?.total ?? 0) - savings;
  const perServing = data.servings ? total / data.servings : null;
  const budget = data.budget_check.budget;
  const maxTotal = Math.max(...data.totals.map((t) => t.total), 1);
  const pricedAt = new Date(data.priced_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Pill text={data.cuisine} icon="globe-outline" />
        <H1>{data.title}</H1>
        <Muted>{data.description}</Muted>
      </View>

      <View style={st.meta}>
        <Meta icon="people-outline" text={`Serves ${data.servings}`} />
        <Meta icon="snow-outline" text={`Keeps ${data.fridge_days} days in the fridge`} />
        <Meta icon="time-outline" text={`${data.total_minutes} min`} />
        <Meta icon="bar-chart-outline" text={`Difficulty ${data.difficulty}/10`} />
      </View>

      {/* Price */}
      <Card style={{ gap: 12 }}>
        <View style={st.rowBetween}>
          <View style={{ gap: 2 }}>
            <Label style={{ color: C.muted }}>Approx. price</Label>
            <Text style={st.bigPrice}>{money(total)}</Text>
            {perServing != null && <Muted>{money(perServing)} per serving</Muted>}
          </View>
          <Pill
            tone={total <= budget ? 'good' : 'bad'}
            icon={total <= budget ? 'checkmark-circle' : 'alert-circle'}
            text={total <= budget ? `Under your ${money(budget)} budget` : `Over your ${money(budget)} budget`}
          />
        </View>
        {bestStore && (
          <View style={st.reason}>
            <Ionicons name="storefront-outline" size={18} color={C.good} />
            <Body style={{ flex: 1, fontSize: 14 }}>{data.recommended.reason}</Body>
          </View>
        )}
        <View style={{ gap: 8 }}>
          {data.totals.map((t) => {
            const isBest = t.locationId === bestId;
            const store = data.stores.find((s) => s.locationId === t.locationId);
            return (
              <View key={t.locationId} style={{ gap: 4 }}>
                <View style={st.rowBetween}>
                  <Text style={[st.storeName, isBest && { color: C.good }]} numberOfLines={1}>
                    {isBest ? '★ ' : ''}
                    {t.name}
                    {store?.distanceMi != null ? `  ·  ${store.distanceMi.toFixed(1)} mi` : ''}
                  </Text>
                  <Text style={[st.storeTotal, isBest && { color: C.good }]}>
                    {t.found ? money(t.total) : 'n/a'}
                  </Text>
                </View>
                <View style={st.barTrack}>
                  <View
                    style={[st.bar, { width: `${(t.total / maxTotal) * 100}%`, backgroundColor: isBest ? C.good : C.faint }]}
                  />
                </View>
                <Muted style={{ fontSize: 12 }}>
                  {t.found} of {data.items.filter((i) => !i.already_have).length} items found
                </Muted>
              </View>
            );
          })}
        </View>
        <Muted style={{ fontSize: 12 }}>
          {data.demo
            ? 'Demo mode: sample prices at demo stores. Connect Kroger for live prices.'
            : `Live Kroger prices, checked at ${pricedAt}. Prices can change in store.`}
        </Muted>
      </Card>

      {/* Why */}
      {data.how_personalized ? (
        <Card style={{ backgroundColor: C.cardAlt }}>
          <View style={st.rowGap}>
            <Ionicons name="sparkles" size={18} color={C.primary} />
            <H3>Why Frankly made it this way</H3>
          </View>
          <Body style={{ fontSize: 14 }}>{data.how_personalized}</Body>
        </Card>
      ) : null}

      {/* Swaps */}
      {swaps.length > 0 && (
        <Card>
          <View style={st.rowGap}>
            <Ionicons name="swap-horizontal" size={18} color={C.good} />
            <H3>Cheaper swaps</H3>
          </View>
          {swaps.map((i) => {
            const on = applied.includes(i.name);
            return (
              <Pressable
                key={i.name}
                onPress={() => setApplied(on ? applied.filter((n) => n !== i.name) : [...applied, i.name])}
                style={[st.swap, on && { borderColor: C.good, backgroundColor: C.goodSoft }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body style={{ fontFamily: F.medium }}>
                    {i.swap!.name} instead of {i.name}
                  </Body>
                  <Muted style={{ fontSize: 13 }}>{i.swap!.reason}</Muted>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={st.save}>save {money(i.swap!.savings)}</Text>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? C.good : C.faint} />
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}

      {/* Ingredients */}
      <View style={{ gap: 8 }}>
        <H2>Ingredients</H2>
        <Muted>Tap the pin to see where to find each item.</Muted>
        <Card style={{ gap: 0, paddingVertical: 6 }}>
          {data.items.map((item, idx) => {
            const swapped = item.swap && applied.includes(item.name);
            const pick = bestId ? (swapped ? item.swap!.pick : item.prices[bestId]) : null;
            return (
              <View key={item.name} style={[st.ingredient, idx > 0 && st.divider]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body style={{ fontFamily: F.medium }}>
                    {swapped ? item.swap!.name : item.name}
                  </Body>
                  <Muted style={{ fontSize: 13 }}>{swapped ? item.swap!.amount_text : item.amount_text}</Muted>
                  {item.already_have ? (
                    <Pill tone="good" icon="home-outline" text="You already have this" />
                  ) : item.is_staple ? (
                    <Pill icon="bookmark-outline" text="Staple: remembered" />
                  ) : null}
                </View>
                {!item.already_have && (
                  <>
                    <Text style={st.itemPrice}>{pick ? money(pick.cost) : 'not found'}</Text>
                    <Pressable onPress={() => setWhere(item)} style={st.pin} hitSlop={8}>
                      <Ionicons name="location" size={18} color={C.primary} />
                    </Pressable>
                  </>
                )}
              </View>
            );
          })}
        </Card>
      </View>

      {/* Steps */}
      <View style={{ gap: 8 }}>
        <H2>Steps</H2>
        {helperRecipeId && <Muted style={{ fontSize: 13 }}>Stuck? Tap a step number to ask Frankly.</Muted>}
        {data.steps.map((step, idx) => (
          <View
            key={idx}
            style={st.step}
            ref={(el) => {
              stepRefs.current[idx] = el;
            }}>
            {helperRecipeId ? (
              <Pressable
                onPress={() => openHelp(idx)}
                hitSlop={10}
                accessibilityLabel={`Ask Frankly about step ${idx + 1}`}
                style={({ pressed }) => [st.stepNum, st.stepNumHelp, pressed && { transform: [{ scale: 0.9 }, { rotate: '-8deg' }] }]}>
                <Text style={st.stepNumText}>{idx + 1}</Text>
                {chats[idx]?.length ? <View style={st.askedDot} /> : null}
              </Pressable>
            ) : (
              <View style={st.stepNum}>
                <Text style={st.stepNumText}>{idx + 1}</Text>
              </View>
            )}
            <Body style={{ flex: 1 }}>{step.replace(/^\d+[.)]\s*/, '')}</Body>
          </View>
        ))}
      </View>

      <WhereSheet item={where} data={data} onClose={() => setWhere(null)} />
      {help && helperRecipeId && (
        <StepHelper
          recipeId={helperRecipeId}
          stepIndex={help.index}
          stepText={data.steps[help.index]?.replace(/^\d+[.)]\s*/, '') ?? ''}
          anchor={help.anchor}
          history={chats[help.index] ?? []}
          onHistory={(next) => setChats((c) => ({ ...c, [help.index]: next }))}
          onClose={() => setHelp(null)}
        />
      )}
    </View>
  );
}

function Meta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={st.metaItem}>
      <Ionicons name={icon} size={15} color={C.muted} />
      <Muted style={{ fontSize: 13 }}>{text}</Muted>
    </View>
  );
}

/** The ingredient "location button": which product, which aisle, what it costs at each store. */
function WhereSheet({ item, data, onClose }: { item: Item | null; data: RecipeData; onClose: () => void }) {
  if (!item) return null;
  const options = data.stores
    .map((s) => ({ store: s, pick: item.prices[s.locationId] }))
    .sort((a, b) => (a.pick?.cost ?? 1e9) - (b.pick?.cost ?? 1e9));
  const cheapest = options[0]?.pick?.cost;
  return (
    <Sheet visible onClose={onClose} title={`Where to find ${item.name}`}>
      <View style={{ gap: 10 }}>
        {options.map(({ store, pick }) => (
          <Card key={store.locationId} style={[{ gap: 6, padding: 14 }, pick?.cost === cheapest && { borderColor: C.good }]}>
            <View style={st.rowBetween}>
              <H3>{store.name}</H3>
              {pick?.cost === cheapest && <Pill tone="good" text="Cheapest" />}
            </View>
            <Muted style={{ fontSize: 12 }}>
              {store.address}
              {store.distanceMi != null ? ` · ${store.distanceMi.toFixed(1)} mi` : ''}
            </Muted>
            {pick ? (
              <>
                <Body style={{ fontSize: 14 }}>{pick.description}</Body>
                <View style={st.rowBetween}>
                  <Muted>
                    {pick.packages} × {pick.size || 'each'} at {money(pick.price)}
                  </Muted>
                  <Text style={st.itemPrice}>{money(pick.cost)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {pick.aisle && <Pill icon="navigate-outline" text={pick.aisle} />}
                  {pick.onSale && <Pill tone="good" icon="pricetag-outline" text={`On sale, was ${money(pick.regularPrice)}`} />}
                </View>
              </>
            ) : (
              <Muted>Not found at this store.</Muted>
            )}
          </Card>
        ))}
      </View>
    </Sheet>
  );
}

const st = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bigPrice: { fontFamily: F.display, fontSize: 40, color: C.ink, lineHeight: 46 },
  reason: { flexDirection: 'row', gap: 8, backgroundColor: C.goodSoft, borderRadius: R.md, padding: 12 },
  storeName: { fontFamily: F.medium, fontSize: 14, color: C.ink, flex: 1 },
  storeTotal: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: C.cardAlt, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  swap: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line },
  save: { fontFamily: F.bold, color: C.good, fontSize: 14 },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: C.line },
  itemPrice: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  pin: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontFamily: F.bold, color: C.onPrimary, fontSize: 13 },
  stepNumHelp: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: C.accentSoft },
  askedDot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent, borderWidth: 2, borderColor: C.bg },
});
