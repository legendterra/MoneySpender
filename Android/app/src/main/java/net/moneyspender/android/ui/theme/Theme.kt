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
    primary = Color(0xFF4D84FF),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDCE8FF),
    onPrimaryContainer = Color(0xFF123278),
    secondary = Color(0xFF12986D),
    onSecondary = Color.White,
    tertiary = Color(0xFFF59E0B),
    onTertiary = Color(0xFF3E2900),
    background = Color(0xFFF2F7FF),
    onBackground = Color(0xFF102245),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF102245),
    surfaceVariant = Color(0xFFEAF2FF),
    onSurfaceVariant = Color(0xFF5C739C),
    outline = Color(0xFFB8CAE9),
    error = Color(0xFFE55A7D),
    onError = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF9AB8FF),
    onPrimary = Color(0xFF041225),
    primaryContainer = Color(0xFF17397F),
    onPrimaryContainer = Color(0xFFE2EBFF),
    secondary = Color(0xFF6DE0B3),
    onSecondary = Color(0xFF052319),
    tertiary = Color(0xFFFFC86B),
    onTertiary = Color(0xFF2F2000),
    background = Color(0xFF08111F),
    onBackground = Color(0xFFF0F5FF),
    surface = Color(0xFF0D1A30),
    onSurface = Color(0xFFF0F5FF),
    surfaceVariant = Color(0xFF13243F),
    onSurfaceVariant = Color(0xFFABC0E4),
    outline = Color(0xFF314D79),
    error = Color(0xFFFF8CAA),
    onError = Color(0xFF3C0618),
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
