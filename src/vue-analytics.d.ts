import _Vue, { PluginFunction } from 'vue'

declare class VueAnalytics {
  public static install(Vue: typeof _Vue, options: any): void
  public analyticsMiddleware: any
  public onAnalyticsReady: any
  public event: any
  public ecommerce: any
  public set: any
  public page: any
  public query: any
  public screenview: any
  public time: any
  public require: any
  public exception: any
  public social: any
  public disable: any
  public enable: any
}
export default VueAnalytics

declare module 'vue-analytics' {

}

declare module 'vue/types/options' {
  interface ComponentOptions<V extends _Vue> {
    ga?: VueAnalytics
  }
}

declare module 'vue/types/vue' {
  interface Vue {
    $ga: VueAnalytics
  }
}
