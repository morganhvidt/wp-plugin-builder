
<h1 align="center">
Morgan's WordPress Plugin Builder
</h1>
<p align="center">
<img src="https://github.com/morganhvidt/wp-plugin-builder/assets/10958823/fc3d1eec-5b98-494e-b768-bb4c568aa3c7" width="200">
</p>

<p align="center">
✨ <a href="https://x.com/morganhvidt"> @morganhvidt Twitter / X</a>&nbsp | <a href="https://morganhvidt.com/"> morganhvidt.com</a>&nbsp
</p>
<br>

---

I'm open sourcing my **WordPress Plugin Builder** scripts for all to use and help extend.

- Build standalone or freemium WordPress plugins in **one codebase**.
- **Code block splitting** between free & pro versions.
- Build & compile React scripts for the WordPress Block Editor.
- Replace tags during build time such as `XPLUGIN_VERSION` or `XPLUGIN_NAME`.
- Native using [WordPress Scripts](https://www.npmjs.com/package/@wordpress/scripts) (No Gulp, or other dependencies).
- **Development Mode** for automatically rebuilding changed files & scripts.
- **Production Mode** for building assets and zip files automatically.
- Built for MacOS (Untested on Windows)

Let's speed up WordPress plugin development! Don't forget to say hi on twitter/X [@morganhvidt](https://x.com/morganhvidt)



https://github.com/morganhvidt/wp-plugin-builder/assets/10958823/a99ca105-620d-42a4-be8c-81eecca13214



## Why did I build this?

I've been developing WordPress plugins for years now. Working on two codebases sucked, and I don't like the add-on because you can't predict which version your customers have installed. 

That's why I created this build process for each version of plugin to be standalone. 

- All coding takes place inside a `src` folder.
- Running the script will create a `production` folder which generates each version of your plugin (free/pro), along with a `zips` folder.

**🔥 HOT TIP**: Faster local environment testing - I use symbolic links to run each plugin on multiple LocalWP sites at the same time.

## Get Started

The WordPress Plugin Builder meant to be copied into your project __(until someone helps me create a NPM package 👋)__.

### Copy the config & build files.
There's two important files you need in the root of your repo.

- `wp-plugins.config.js` - Set up your plugin configuration here. See [morganhvidt/find-my-blocks](https://github.com/morganhvidt/find-my-blocks) for a live example
- `wp-plugins.build.js` - No need to edit anything, just drop it into the project.

### Setup package.json

In your `package.json` file you'll need to add the below script paths, and the `@wordpress/scripts` dependency.

``` json
  "scripts": {
    "dev": "node wp-plugins.build.js dev",
    "build": "node wp-plugins.build.js build",
    "production": "node wp-plugins.build.js production",
  },
  "dependencies": {
    "@wordpress/scripts": "^27.6.0"
  },
```

Then run `npm install`.

While coding you'd run `npm run dev`, and to create production ready zip files `npm run production`.

## Replacing tags 

Tags are replaced during dev, build & production mode. These are helpful for a when free & pro versions have

In your `wp-plugins.config.js` you'll set the plugins name and more information. Most of these fields can be called within your `src` by writing `XPLUGIN_`.

- `XPLUGIN_NAME`
- `XPLUGIN_SLUG`
- `XPLUGIN_VERSION`
- `XPLUGIN_AUTHOR`
- `XPLUGIN_DESCRIPTION`
- `XPLUGIN_EDD_ITEM_ID`
- `XPLUGIN_EDD_STORE_URL`

There's more examples in the build file itself.

**🔥 HOT TIP**: These tags are awesome for creating re-usable classes between plugins projects.

## Code Block Splitting

Code splitting is done using comments. You can also exclude specific files inside the `wp-plugins.config.js`

``` php
// @if type = 'premium'
$text = "This text will be in the premium version only";
// @endif

// @if type = 'free'
$text = "This section will be in the free plugin.";
// @endif
```

## Working with WordPress Components & React

The scripted are handled by the official WordPress scripts. This greatly streamlines the amount of code and configuration we need to do.

The script entry and output paths are configured in the `wp-plugins.config.js` per plugin. You will still need to enqueue the compiled scripts within your code.

See [morganhvidt/find-my-blocks](https://github.com/morganhvidt/find-my-blocks) for a live example.

## CSS Minification & File Processing

The build process includes a powerful minify feature that allows you to process CSS files and other assets with custom input/output paths. This is particularly useful for organizing assets in your production builds.

### Basic Minify Configuration

In your `wp-plugins.config.js`, you can configure the minify array to specify which files should be processed and where they should be output:

```javascript
minify: [
  {
    entry: 'src/admin/gallery-videos.css',
    output: './production/product-videos-for-woocommerce/admin/gallery-videos.css',
  },
  {
    entry: 'src/gallery/gallery-videos.css',
    output: './production/product-videos-for-woocommerce/gallery/gallery-videos.css',
  },
]
```

### How Minify Works

- **Custom Paths**: Unlike the standard file copying, minify allows you to override the default output structure
- **File Processing**: CSS files are minified and optimized during the build process
- **Directory Creation**: Output directories are automatically created if they don't exist
- **Multiple Targets**: You can specify different output paths for the same source file across different plugin versions

### Advanced Examples

```javascript
minify: [
  // Admin styles
  {
    entry: 'src/admin/styles/main.css',
    output: './production/my-plugin-free/assets/admin.css',
  },
  // Frontend gallery styles
  {
    entry: 'src/frontend/gallery/styles.css',
    output: './production/my-plugin-free/public/gallery.css',
  },
  // Premium-specific styles
  {
    entry: 'src/premium/advanced-features.css',
    output: './production/my-plugin-pro/assets/premium.css',
  },
]
```

**🔥 HOT TIP**: Use the minify feature to reorganize your asset structure for cleaner production builds, especially when you need different folder structures than your source code.

## Wishlist

- [ ] Make available as NPM package.
- [ ] Automatic translation file generation during production build. 

