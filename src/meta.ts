import defu from 'defu'
import Vue from 'vue'
import {
  getCurrentInstance,
  toRefs,
  Ref,
  reactive,
  watch,
  UnwrapRef,
  customRef,
  set,
} from '@vue/composition-api'

import type { MetaInfo } from 'vue-meta'

export type ReactiveHead<T = Record<string, unknown>> = UnwrapRef<
  Ref<MetaInfo & T>
>

type MetaInfoMapper<T> = {
  [P in keyof T]: P extends 'base'
    ? T[P] | undefined
    : T[P] extends () => any
    ? T[P] | undefined
    : T[P] extends Array<any> | Record<string, unknown>
    ? T[P]
    : T[P] | undefined
}

function assign<T extends Record<string, any>>(target: T, source: Partial<T>) {
  Object.entries(source).forEach(([key, value]) => {
    set(target, key, value)
  })
  return target
}

export function createEmptyMeta(): Omit<
  MetaInfoMapper<Required<MetaInfo>>,
  'titleTemplate'
> {
  return {
    __dangerouslyDisableSanitizers: [],
    __dangerouslyDisableSanitizersByTagID: {},

    title: undefined,
    htmlAttrs: {},
    headAttrs: {},
    bodyAttrs: {},

    base: undefined,

    meta: [],
    link: [],
    style: [],
    script: [],
    noscript: [],

    changed: undefined,
    afterNavigation: undefined,
  }
}

export const getHeadOptions = (options: {
  head: () => Record<string, any> | Record<string, any>
}) => {
  const _head: ReactiveHead =
    options.head instanceof Function
      ? reactive<MetaInfo>({})
      : reactive<MetaInfo>(options.head)
  const head =
    options.head instanceof Function
      ? () => defu(_head, options.head())
      : () => _head
  return { _head, head }
}

type ToRefs<T extends Record<string, any>> = {
  [P in keyof T]: Ref<T[P]>
}

/**
 * `useMeta` lets you interact directly with [`head()` properties](https://nuxtjs.org/api/pages-head/) in `setup`. **Make sure you set `head: {}` in your component options.**
 * @example
    ```ts
    import { defineComponent, useMeta, computed } from '@nuxtjs/composition-api'

    export default defineComponent({
      head: {},
      setup() {
        const { title } = useMeta()
        title.value = 'My page'
      })
    })
    ```
 * @param init Whatever defaults you want to set for `head` properties.
 */
export const useMeta = <T extends MetaInfo>(init?: T) => {
  const vm = getCurrentInstance()
  if (!vm) throw new Error('useMeta must be called within a component.')

  if (!('_head' in vm.$options))
    throw new Error(
      'In order to enable `useMeta`, please make sure you include `head: {}` within your component definition, and you are using the `defineComponent` exported from @nuxtjs/composition-api.'
    )

  const { _head = reactive({}) as ReactiveHead } = vm.$options

  assign(_head, createEmptyMeta())
  assign<MetaInfo>(_head, init || {})

  const refs = toRefs(_head) as ToRefs<
    ReturnType<typeof createEmptyMeta> & {
      titleTemplate: ReactiveHead['titleTemplate']
    } & T
  >

  refs.titleTemplate = customRef<ReactiveHead['titleTemplate']>(
    (track, trigger) => {
      return {
        get() {
          track()
          return _head.titleTemplate
        },
        set(newValue) {
          if (!_head.titleTemplate) {
            set(_head, 'titleTemplate', newValue)
          } else {
            _head.titleTemplate = newValue
          }
          trigger()
        },
      }
    }
  )

  if (process.client)
    watch(Object.values(refs), vm.$meta().refresh, { immediate: true })

  return refs
}
