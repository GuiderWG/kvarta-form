const mix = require('laravel-mix');

Mix.manifest.refresh = () => void 0; // Отключаем mix-manifest.json для проектов Laravel, нам он не нужен

// Общие параметры проекта
mix.setPublicPath('public'); // Результирующая папка, относительно которой именовать модули
mix.setResourceRoot('../'); // URL'ы, относительно которых будут включаться внешние ресурсы ассетов
mix.disableNotifications(); // Без всплывающих сообщений о результатах сборки
mix.options({
  //processCssUrls: false, // Перестаём исправлять пути к ресурсам (следим самостоятельно!)
});
mix.webpackConfig({
  devtool: false, // Картографирование не нужно в принципе
});

// Бандл проекта
mix.js('resources/js/app.js', 'public/js/bundle.js');
mix.sass('resources/sass/app.scss', 'public/css/bundle.css');

// Сборка шаблонов
require('laravel-mix-twig-to-html');
mix.twigToHtml({
  files: [
    {
      template: 'resources/twig/**/*.{twig,html}',
      minify: {
        collapseWhitespace: false,
        removeComments: true,
      },
      inject: false,
    },
  ],
  fileBase: 'resources/twig',
});

// Кастомные файлы вне проекта не проходят минификацию на продакшне
//mix.babel('resources/js/main.js', 'public/js/main.js'); // FIXME babel ломает watch за файлом
mix.js('resources/js/main.js', 'public/js/main.js'); // FIXME убрать обёртку WebpackModule/WebpackBootstrap (ждём Webpack 5?)
mix.sass('resources/sass/main.scss', 'public/css/main.css');

// Синхронизируем папку с изображениями, сохраняем иерархию папок
require('laravel-mix-copy-watched');
mix.copyDirectoryWatched('resources/img', 'public/images', { base: 'resources/img' });

// Синхронизируем статику, сохраняем иерархию папок
mix.copyDirectoryWatched('resources/static', 'public', { base: 'resources/static' });

// На production'е есть оптимизация и минификация
if (mix.inProduction()) {
  mix.options({
    // Удаляем все CSS комментарии (production)
    cssNano: {
      discardComments: {
        removeAll: true,
      },
    },
    // Удаляем все JS комментарии (production)
    terser: {
      extractComments: false,
      terserOptions: {
        output: {
          comments: false,
        },
      },
      // Минимизируем все ".js" модули, но не "main.js"
      exclude: /main\.js(\?.*)?$/i,
    },
  });

  Mix.listen('configReady', function (config) {
    for (let mm of config.optimization.minimizer) {
      // Минимизируем все ".css" модули, но не "main.css"
      if (mm.constructor.name === 'OptimizeCssAssetsWebpackPlugin') {
        mm.options.assetProcessors[0].regExp = /(?<!main)\.css(\?.*)?$/i;
      }
    }
  });
} else {
  // ESLint для нашего кода
  require('laravel-mix-eslint');
  mix.eslint();

  // Запуск с параметром --watch
  if (Mix.isWatching()) {
    // Placeholder
  }

  // Запуск с параметром --hot
  if (Mix.shouldHotReload()) {
    //const path = require('path');

    // Тюнингуем WDS
    mix.webpackConfig({
      devServer: {
        clientLogLevel: 'none',
        open: true,
        overlay: true,
        // Фикс для CORS
        disableHostCheck: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        // Перезагружать также при изменении контента шаблонов
        contentBase: ['public', 'resources/twig'], // Обслуживание статики и шаблонов
        watchContentBase: true,
        watchOptions: {
          aggregateTimeout: 300,
          poll: 500,
          ignored: ['storage', 'node_modules', 'vendor'],
        },
        // Сохранять модули на диск (много мусора)
        //writeToDisk: true,
      },
      optimization: {
        noEmitOnErrors: true,
      },
      // Сохранять модули на диск (фикс бага с путями)
      // output: {
      //     path: path.resolve(__dirname, 'public'),
      // },
    });

    // Перехватываем WebpackDevServer и cинхронизируем браузеры, подключённые к порту :3000
    mix.browserSync({
      proxy: 'localhost:8080', // WebpackDevServer обслуживает localhost:8080
    });
  }
}
