const { defineConfig } = require("@vue/cli-service");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
module.exports = defineConfig({
  publicPath: '/',
  pwa: {
    iconPaths: {
      favicon32: 'img/icons/favicon-128.ico',
      favicon16: 'img/icons/favicon-64.ico'
    }
  },
  transpileDependencies: true,
  configureWebpack: {
    plugins: [new NodePolyfillPlugin()],
    optimization: {
      splitChunks: {
        chunks: "all",
      },
    },
  },
});
