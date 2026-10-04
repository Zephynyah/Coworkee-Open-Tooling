const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const portfinder = require('portfinder');

module.exports = async function (env, argv) {
  const mode = (argv && argv.mode) || 'development';
  const isProd = mode === 'production';

  portfinder.basePort = (env && env.port) || 1962;
  const port = await portfinder.getPortPromise();

  return {
    mode: mode,
    performance: { hints: false },
    devtool: isProd ? false : 'inline-source-map',
    context: path.join(__dirname, './'),
    entry: {
      main: './app.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      publicPath: ''
    },
    // Treat Ext as an external global from the statically loaded ext-modern-all.js
    externals: {
      Ext: 'Ext'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/
        }
      ]
    },
    plugins: [
      // 1. Copy the pre-built Modern Ext JS static files to output
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'ext/build/ext-modern-all.js'),
            to: 'ext/ext-modern-all.js'
          },
          {
            from: path.resolve(__dirname, 'ext/build/modern/theme-material/resources'),
            to: 'ext/resources'
          },
          {
            from: path.resolve(__dirname, 'ext/build/modern/theme-material/theme-material.js'),
            to: 'ext/theme-material.js'
          },
          // Copy application source files so dynamic profile resolution works
          {
            from: path.resolve(__dirname, 'app'),
            to: 'app'
          },
          // Copy application static resources (images referenced by the theme/app scss)
          {
            from: path.resolve(__dirname, 'resources'),
            to: 'resources'
          },
          // Copy the class overrides. They are loaded as plain <script> tags from
          // index.html rather than bundled, because webpack cannot resolve files that
          // live under packages/local/coworkee: the Sencha package.json is a commented,
          // non-JSON manifest and fails as a webpack "directory description file".
          {
            from: path.resolve(__dirname, 'packages/local/coworkee/overrides'),
            to: 'overrides/coworkee'
          },
          {
            from: path.resolve(__dirname, 'overrides'),
            to: 'overrides'
          }
        ]
      }),

      // 2. Inject output app bundle into HTML
      new HtmlWebpackPlugin({
        template: 'index.html',
        hash: true,
        inject: 'body'
      })
    ],
    devServer: {
      contentBase: path.resolve(__dirname, 'dist'),
      historyApiFallback: true,
      host: '0.0.0.0',
      port: port,
      compress: isProd,
      inline: !isProd,
      stats: 'errors-warnings',
      // The Ext.Direct API is served by the Node server on port 3000. index.html loads
      // it from the same origin (`/api/`), so proxy it to make the dev server work too.
      proxy: {
        '/api': 'http://localhost:3000'
      }
    }
  };
};