import { NgRspackPlugin, NgRspackPluginOptions } from '../plugins/ng-rspack';
import {
  Configuration,
  DevServer,
  SwcJsMinimizerRspackPlugin,
} from '@rspack/core';
import { join, resolve } from 'path';

export function createConfig(options: NgRspackPluginOptions) {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const config: Configuration = {
    context: options.root,
    target: 'web',
    mode: isProduction ? 'production' : 'development',
    entry: {
      main: {
        import: [options.main],
      },
      polyfills: {
        import: options.polyfills ?? [],
      },
      styles: {
        import: options.styles ?? [],
      },
      ...(options.scripts ? { scripts: { import: options.scripts } } : {}),
    },
    devServer: {
      allowedHosts: 'auto',
      client: {
        overlay: {
          errors: true,
          warnings: false,
          runtimeErrors: true,
        },
        reconnect: true,
      },
      historyApiFallback: {
        disableDotRule: true,
      },
      hot: true,
      port: options.port ?? 4200,
      onListening: (devServer) => {
        if (!devServer) {
          throw new Error('@rspack/dev-server is not defined');
        }

        const port =
          (devServer.server?.address() as { port: number })?.port ?? 4200;
        console.log('Listening on port:', port);
      },
    } as DevServer,
    output: {
      uniqueName: options.name,
      hashFunction: 'xxhash64',
      publicPath: 'auto',
      clean: true,
      path: join(options.root, options.outputPath),
      cssFilename: '[name].[contenthash].css',
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].js',
      crossOriginLoading: false,
      trustedTypes: { policyName: 'angular#bundler' },
      scriptType: 'module',
      module: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.mjs', '.js'],
      modules: ['node_modules'],
      mainFields: ['es2020', 'es2015', 'browser', 'module', 'main'],
      conditionNames: ['es2020', 'es2015', '...'],
      tsConfig: {
        configFile: resolve(options.root, options.tsConfig),
      },
    },
    optimization: isProduction
      ? {
          minimize: true,
          runtimeChunk: 'single',
          splitChunks: {
            chunks: 'all',
            minChunks: 1,
            minSize: 20000,
            maxAsyncRequests: 30,
            maxInitialRequests: 30,
            cacheGroups: {
              defaultVendors: {
                test: /[\\/]node_modules[\\/]/,
                priority: -10,
                reuseExistingChunk: true,
              },
              default: {
                minChunks: 2,
                priority: -20,
                reuseExistingChunk: true,
              },
            },
          },
          minimizer: [new SwcJsMinimizerRspackPlugin()],
        }
      : {},
    experiments: {
      css: true,
    },
    module: {
      parser: {
        javascript: {
          requireContext: false,
          url: false,
        },
        'css/auto': {
          esModule: true,
        },
      },
      rules: [
        {
          test: /\.?(sa|sc|c)ss$/,
          use: [
            {
              loader: 'sass-loader',
              options: {
                api: 'modern-compiler',
                implementation: require.resolve('sass-embedded'),
              },
            },
          ],
          type: 'css/auto',
        },
        { test: /[/\\]rxjs[/\\]add[/\\].+\.js$/, sideEffects: true },
        {
          test: /\.[cm]?[jt]sx?$/,
          use: [
            {
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: {
                    syntax: 'typescript',
                  },
                },
              },
            },
            {
              loader: require.resolve(
                '@ng-rspack/build/src/lib/loaders/angular-loader.js'
              ),
            },
          ],
        },
        {
          test: /\.[cm]?js$/,
          use: [
            {
              loader: require.resolve(
                '@ng-rspack/build/src/lib/loaders/js-loader.js'
              ),
            },
          ],
        },
      ],
    },
    plugins: [new NgRspackPlugin(options)],
  };

  return config;
}
