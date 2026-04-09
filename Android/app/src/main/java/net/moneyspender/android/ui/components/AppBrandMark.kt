package net.moneyspender.android.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import net.moneyspender.android.R

@Composable
fun AppBrandMark(
    modifier: Modifier = Modifier,
    accent: Color = Color(0xFF4D84FF),
    accentStrong: Color = Color(0xFF2451C8),
    contentColor: Color = Color.White,
) {
    Box(
        modifier = modifier
            .aspectRatio(1f)
            .clip(CircleShape)
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        accent.copy(alpha = 0.2f),
                        accentStrong.copy(alpha = 0.16f),
                    ),
                ),
            )
            .border(1.dp, contentColor.copy(alpha = 0.28f), CircleShape),
    ) {
        Image(
            painter = painterResource(id = R.drawable.logo_circular),
            contentDescription = "Logo MoneySpender",
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxSize()
                .clip(CircleShape),
        )
    }
}
