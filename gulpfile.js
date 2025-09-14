"use strict";
// active
const { src, dest } = require("gulp");
const gulp = require("gulp");
const autoprefixer = require("gulp-autoprefixer");
const cssbeautify = require("gulp-cssbeautify");
const removeComments = require("gulp-strip-css-comments");
const rename = require("gulp-rename");
const sass = require("gulp-sass")(require("sass"));
// const sass = require('sass');
const include = require("gulp-file-include");
const htmlmin = require("gulp-htmlmin");
const cleanCSS = require("gulp-clean-css");
// const postcss = require("gulp-postcss");
// const cssnano = require("gulp-cssnano");
const rigger = require("gulp-rigger");
const uglify = require("gulp-uglify");
const sourcemaps = require("gulp-sourcemaps");
const plumber = require("gulp-plumber");

// images
// const imagemin = require("gulp-imagemin");
// const imgCompress = require("imagemin-jpeg-recompress");
// УДАЛЕНО: const webp = require("gulp-webp");
// УДАЛЕНО: const webphtml = require("gulp-webp-html");
// УДАЛЕНО: const webpcss = require("gulp-webpcss");

// fonts

const del = require("del");
const panini = require("panini");
const browsersync = require("browser-sync").create();
// not active
// const pug = require("pug");
// const svgSprite = require("gulp-svg-sprite");

/* Paths */
const path = {
  build: {
    html: "dist/",
    js: "dist/assets/js",
    css: "dist/assets/css",
    images: "dist/assets/img",
    // fonts:  "dist/assets/fonts"
  },
  src: {
    html: "src/*.html",
    js: "src/assets/js/*.js",
    css: "src/assets/sass/style.scss",
    images: "src/assets/img/**/*.{jpg,jpeg,png,svg,ico,webp,webmanifest,xml}",
    // fonts:  "src/assets/fonts/*.{ttf,otf,woff,woff2}"
  },
  watch: {
    html: "src/**/*.html",
    js: "src/assets/js/**/*.js",
    css: "src/assets/sass/**/*.scss",
    images: "src/assets/img/**/*.{jpg,jpeg,png,svg,ico,webp,webmanifest,xml}",
    // fonts:  "src/assets/fonts/*.{ttf,otf,woff,woff2}"
  },
  clean: "./dist",
};

/* Tasks */
function browserSync(done) {
  browsersync.init({
    browser:
      "C:\\Users\\vidri\\AppData\\Local\\CentBrowser\\Application\\chrome.exe",
    server: {
      baseDir: "./dist/",
    },
    ui: {
      port: 333,
    },
    port: 666,
    // tunnel: true,
    // tunnel: "yaro"
  });
  done();
}

function browserSyncReload(done) {
  browsersync.reload();
  done();
}

function html() {
  panini.refresh();
  return (
    src(path.src.html, {
      base: "src/",
    })
      .pipe(plumber())
      .pipe(
        panini({
          root: "src/",
          layouts: "src/tpl/layouts/",
          partials: "src/tpl/parts/",
          helpers: "src/tpl/helpers/",
          data: "src/tpl/data/",
        })
      )
      // УДАЛЕНО: .pipe(webphtml())
      .pipe(
        htmlmin({
          collapseWhitespace: true,
        })
      )
      // .pipe(include({
      //     prefix: '@@',
      //     basepath: '@file'
      // }))
      .pipe(dest(path.build.html))
      .pipe(browsersync.stream())
  );
}

function css() {
  return (
    src(path.src.css, {
      base: "src/assets/sass/",
    })
      .pipe(sourcemaps.init())
      // .pipe(plumber(cssnano))
      .pipe(
        sass({
          outputStyle: "expanded",
          includePaths: ["node_modules"],
        }).on("error", sass.logError)
      )
      // .pipe(sass())
      .pipe(
        autoprefixer({
          overrideBrowserslist: ["last 5 versions"],
          cascade: false,
        })
      )
      // УДАЛЕНО: .pipe(webpcss({ ... }))
      .pipe(cssbeautify())
      .pipe(dest(path.build.css))
      // .pipe(postcss([cssnano({ preset: "default", mergeMedia: false })()]))
      // .pipe(
      //   cssnano({
      //     zindex: false,
      //     discardComments: {
      //       removeAll: true,
      //     },
      //     mergeMedia: false,
      //   })
      // )
      .pipe(
        cleanCSS({
          level: 2,
          mergeMedia: false, // Не перемешивать медиа-запросы
        })
      )
      .pipe(removeComments())
      .pipe(
        rename({
          suffix: ".min",
          extname: ".css",
        })
      )
      .pipe(sourcemaps.write("./"))
      .pipe(dest(path.build.css))
      .pipe(browsersync.stream())
  );
}

function js() {
  return src(path.src.js, {
    base: "./src/assets/js/",
  })
    .pipe(plumber())
    .pipe(rigger())
    .pipe(gulp.dest(path.build.js))
    .pipe(uglify())
    .pipe(
      rename({
        suffix: ".min",
        extname: ".js",
      })
    )
    .pipe(dest(path.build.js))
    .pipe(browsersync.stream());
}

function images() {
  return (
    src(path.src.images)
      // УДАЛЕНО: .pipe(webp({ quality: 70 }))
      // УДАЛЕНО: .pipe(dest(path.build.images))
      .pipe(src(path.src.images))
      .pipe(dest(path.build.images))
  );
}

// Для создания спрайтов, вызывается отдельно через gulp svgSprite
gulp.task("svgSprite", function () {
  return gulp
    .src(["src/assets/img/svg/sprites/*.svg"])
    .pipe(
      svgSprite({
        mode: {
          stack: {
            sprite: "../svg/icons.svg",
            example: true,
          },
        },
      })
    )
    .pipe(dest(path.build.images));
});

function clean() {
  return del(path.clean);
}

function watchFiles() {
  gulp.watch([path.watch.html], html);
  gulp.watch([path.watch.css], css);
  gulp.watch([path.watch.js], js);
  gulp.watch([path.watch.images], images);
}

const build = gulp.series(clean, gulp.parallel(html, css, js, images));
const watch = gulp.series(build, gulp.parallel(watchFiles, browserSync));

exports.html = html;
exports.css = css;
exports.js = js;
exports.images = images;
exports.clean = clean;
exports.build = build;
exports.watch = watch;
exports.default = gulp.series(build, gulp.parallel(watchFiles, browserSync));
// exports.default = watch;
