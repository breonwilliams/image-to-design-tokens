# Image to Design Tokens - Project Notes

## WordPress.org SVN Deployment

### Repository Details
- **SVN URL**: https://plugins.svn.wordpress.org/image-to-design-tokens
- **Local SVN checkout**: `/Users/breonwilliams/Local Sites/ai-section-builder/app/public/wp-content/plugins/image-to-design-tokens-svn`
- **SVN Username**: BreonWilliams (case sensitive)

### Deployment Steps

1. **Make changes** to the plugin files in this directory (the development copy)

2. **Copy updated files** to the SVN trunk folder:
   ```bash
   cp image-to-design-tokens.php readme.txt "/Users/breonwilliams/Local Sites/ai-section-builder/app/public/wp-content/plugins/image-to-design-tokens-svn/trunk/"
   ```

3. **Verify changes** before committing:
   ```bash
   cd "/Users/breonwilliams/Local Sites/ai-section-builder/app/public/wp-content/plugins/image-to-design-tokens-svn"
   svn status
   svn diff
   ```

4. **Commit to SVN** (user will be prompted for WordPress.org password):
   ```bash
   svn commit -m "Your commit message here" --username BreonWilliams
   ```

5. **Verify** on WordPress.org: https://wordpress.org/plugins/image-to-design-tokens/

### Notes
- Password characters won't appear when typing (normal security behavior)
- WordPress.org may take a few minutes to update cached plugin information
- For version updates, also update the `Stable tag` in readme.txt and `Version` in the main plugin file
