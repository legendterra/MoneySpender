package net.moneyspender.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val LightColors = lightColorScheme(
    primary = Color(0xFF3F9F96),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDDF4F2),
    onPrimaryContainer = Color(0xFF1C5B56),
    secondary = Color(0xFF4EA59E),
    onSecondary = Color.White,
    tertiary = Color(0xFFF0B674),
    onTertiary = Color(0xFF4D3212),
    background = Color(0xFFF8F2EB),
    onBackground = Color(0xFF2F2938),
    surface = Color(0xFFFFFAF4),
    onSurface = Color(0xFF2F2938),
    surfaceVariant = Color(0xFFF2E8DE),
    onSurfaceVariant = Color(0xFF7A6D7E),
    outline = Color(0xFFDDCEC1),
    error = Color(0xFFD75C78),
    onError = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFA8E8E1),
    onPrimary = Color(0xFF13233B),
    primaryContainer = Color(0xFF1E2A47),
    onPrimaryContainer = Color(0xFFF2EAFE),
    secondary = Color(0xFFA8E8E1),
    onSecondary = Color(0xFF13233B),
    tertiary = Color(0xFFF0CDA1),
    onTertiary = Color(0xFF3E3020),
    background = Color(0xFF080D1B),
    onBackground = Color(0xFFEEF2FF),
    surface = Color(0xFF121A2D),
    onSurface = Color(0xFFEEF2FF),
    surfaceVariant = Color(0xFF1A2540),
    onSurfaceVariant = Color(0xFFA6B3D4),
    outline = Color(0xFF2D3856),
    error = Color(0xFFFF9DB0),
    onError = Color(0xFF4A1E2B),
)

private val MoneySpenderShapes = Shapes(
    extraSmall = androidx.compose.foundation.shape.RoundedCornerShape(14.dp),
    small = androidx.compose.foundation.shape.RoundedCornerShape(18.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(24.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(32.dp),
    extraLarge = androidx.compose.foundation.shape.RoundedCornerShape(36.dp),
)

private val MoneySpenderTypography = Typography(
    displaySmall = TextStyle(
        fontWeight = FontWeight.Black,
        fontSize = 36.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.8).sp,
    ),
    headlineMedium = TextStyle(
        fontWeight = FontWeight.ExtraBold,
        fontSize = 28.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.6).sp,
    ),
    headlineSmall = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.4).sp,
    ),
    titleLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.2).sp,
    ),
    titleMedium = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
    ),
    bodyLarge = TextStyle(
        fontSize = 15.sp,
        lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontSize = 14.sp,
        lineHeight = 22.sp,
    ),
    bodySmall = TextStyle(
        fontSize = 12.sp,
        lineHeight = 18.sp,
    ),
    labelLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        lineHeight = 18.sp,
    ),
    labelMedium = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.2.sp,
    ),
)

@Composable
fun MoneySpenderTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = MoneySpenderTypography,
        shapes = MoneySpenderShapes,
        content = content,
    )
}
