# Adjust Colors

You can customize all UI colors in LokalBoards by setting environment variables. This allows you to match the application's appearance to your brand or personal preferences without modifying source files.

## Available Color Variables

All colors support both light and dark mode variants. For dark mode colors, append `Dark` to the variable name (e.g., `COLOR_PRIMARY_DARK` for dark mode).

| Variable | Default (Light) | Default (Dark) |
|----------|----------------|----------------|
| `NUXT_PUBLIC_COLOR_PRIMARY` | `#0066CC` | `#0F72DE` |
| `NUXT_PUBLIC_COLOR_PRIMARY_HOVER` | `#004C99` | `#1C84EC` |
| `NUXT_PUBLIC_COLOR_SECONDARY` | `#12784F` | `#17996A` |
| `NUXT_PUBLIC_COLOR_WHITE` | `#ffffff` | `#ffffff` |
| `NUXT_PUBLIC_COLOR_GRAY` | `#4E4E52` | `#AEAEB2` |
| `NUXT_PUBLIC_COLOR_SLATE` | `#F5F5F7` | `#2C2C2E` |
| `NUXT_PUBLIC_COLOR_BLACK` | `#000000` | `#000000` |
| `NUXT_PUBLIC_COLOR_DARK` | `#1C1C1E` | `#1C1C1E` |

## .env File
Modify your `.env` file:

```dotenv
# Custom Colors
NUXT_PUBLIC_COLOR_PRIMARY="#ff0000"
NUXT_PUBLIC_COLOR_PRIMARY_DARK="#cc0000"
NUXT_PUBLIC_COLOR_SECONDARY="#00ff00"
NUXT_PUBLIC_COLOR_SECONDARY_DARK="#00cc00"
NUXT_PUBLIC_COLOR_GRAY="#333333"
NUXT_PUBLIC_COLOR_GRAY_DARK="#aaaaaa"
NUXT_PUBLIC_COLOR_SLATE="#f5f5f5"
NUXT_PUBLIC_COLOR_SLATE_DARK="#2a2a2a"
```

## How It Works

1. The application reads color values from environment variables at runtime
2. Default colors are used if no environment variables are set
3. Colors are applied via CSS custom properties (CSS variables)
4. Dark mode variants are automatically applied when the user's system prefers dark mode

## Tips

- Use valid HEX color codes (with or without `#` prefix)
- Test your color combinations in both light and dark modes
- Consider accessibility - ensure sufficient contrast between text and background colors
- Restart your application after changing color variables
