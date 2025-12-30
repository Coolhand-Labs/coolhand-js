import path from 'path';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import package.json to get version
const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

// Define plugin to inject version at build time
const definePlugin = new webpack.DefinePlugin({
  __COOLHANDJS_VERSION__: JSON.stringify(packageJson.version),
});

const baseConfig = {
  entry: './src/index.ts',
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [definePlugin],
};

const outputConfig = {
  path: path.resolve(__dirname, 'dist'),
  library: {
    name: 'CoolhandJS',
    type: 'umd',
    export: 'default'
  },
  globalObject: 'this'
};

// Unminified build
const devBuild = {
  ...baseConfig,
  name: 'dev',
  mode: 'development',
  output: {
    ...outputConfig,
    filename: 'coolhand.js',
  },
  devtool: 'source-map',
  optimization: {
    minimize: false,
  },
};

// Minified build
const prodBuild = {
  ...baseConfig,
  name: 'prod',
  mode: 'production',
  output: {
    ...outputConfig,
    filename: 'coolhand.min.js',
  },
  devtool: 'source-map',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false,
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
};

// Dev server config
const devServerConfig = {
  ...baseConfig,
  name: 'dev-server',
  mode: 'development',
  output: {
    ...outputConfig,
    filename: 'coolhand.js',
  },
  devtool: 'eval-source-map',
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'examples'),
      },
      {
        directory: path.join(__dirname, 'dist'),
        publicPath: '/dist',
      }
    ],
    compress: true,
    port: 3333,
    open: false,
    hot: true,
    liveReload: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  },
};

export default (env, argv) => {
  // Dev server
  if (argv.mode === 'development' && process.env.WEBPACK_SERVE) {
    return devServerConfig;
  }
  // Build both minified and unminified
  return [devBuild, prodBuild];
};
