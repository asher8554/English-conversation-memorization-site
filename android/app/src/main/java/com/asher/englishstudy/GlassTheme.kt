// 네이티브 학습 화면에 오프라인 폰트와 배경 블러 유리 패널을 적용한다.
package com.asher.englishstudy

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp

private val Pretendard = FontFamily(Font(R.font.pretendard_regular))

@Composable
fun StudyTheme(dark: Boolean, content: @Composable () -> Unit) {
    val base = Typography()
    fun androidx.compose.ui.text.TextStyle.face() = copy(fontFamily = Pretendard)
    MaterialTheme(colorScheme = if (dark) darkColorScheme(primary = Color(0xFF76E3DC), onPrimary = Color(0xFF12323A),
        background = Color(0xFF17243D), surface = Color(0xFF182A3A), onSurface = Color(0xFFEDFAFA), onSurfaceVariant = Color(0xFF9CA3AF))
        else lightColorScheme(primary = Color(0xFF00695C), surface = Color(0xFFF2F6F8), onSurface = Color(0xFF182736)),
        typography = Typography(displayLarge = base.displayLarge.face(), displayMedium = base.displayMedium.face(),
            displaySmall = base.displaySmall.face(), headlineLarge = base.headlineLarge.face(), headlineMedium = base.headlineMedium.face(),
            headlineSmall = base.headlineSmall.face(), titleLarge = base.titleLarge.face(), titleMedium = base.titleMedium.face(),
            titleSmall = base.titleSmall.face(), bodyLarge = base.bodyLarge.face(), bodyMedium = base.bodyMedium.face(),
            bodySmall = base.bodySmall.face(), labelLarge = base.labelLarge.face(), labelMedium = base.labelMedium.face(),
            labelSmall = base.labelSmall.face())) {
        CompositionLocalProvider(LocalContentColor provides MaterialTheme.colorScheme.onSurface, content = content)
    }
}

private fun DrawScope.backdrop(full: Size, dark: Boolean) {
    if (full.width <= 0f) return
    drawRect(Brush.linearGradient(if (dark) listOf(Color(0xFF112D38), Color(0xFF17243D), Color(0xFF352C3E))
        else listOf(Color(0xFFDFF7F4), Color(0xFFD7E4FB), Color(0xFFF7E7DC)), Offset.Zero, Offset(full.width, full.height)), size = full)
    val radius = 144.dp.toPx()
    val teal = Offset(64.dp.toPx(), 64.dp.toPx())
    val orange = Offset(full.width - 48.dp.toPx(), full.height - 64.dp.toPx())
    drawCircle(Brush.radialGradient(listOf(Color(0xFF89DDD2).copy(alpha = .45f), Color.Transparent), teal, radius), radius, teal)
    drawCircle(Brush.radialGradient(listOf(Color(0xFFF0B68C).copy(alpha = .45f), Color.Transparent), orange, radius), radius, orange)
}

@Composable
fun GlassBackground(dark: Boolean, content: @Composable (Size, Offset) -> Unit) {
    var size by remember { mutableStateOf(Size.Zero) }
    var origin by remember { mutableStateOf(Offset.Zero) }
    Box(Modifier.fillMaxSize().onGloballyPositioned {
        size = Size(it.size.width.toFloat(), it.size.height.toFloat()); origin = it.positionInRoot()
    }) {
        Canvas(Modifier.matchParentSize()) { backdrop(size, dark) }
        content(size, origin)
        Box(Modifier.fillMaxWidth().windowInsetsTopHeight(WindowInsets.statusBars).background(Color.Black))
        Box(Modifier.align(androidx.compose.ui.Alignment.BottomCenter).fillMaxWidth()
            .windowInsetsBottomHeight(WindowInsets.navigationBars).background(Color.Black))
    }
}

@Composable
fun GlassPanel(full: Size, origin: Offset, dark: Boolean, content: @Composable ColumnScope.() -> Unit) {
    var offset by remember { mutableStateOf(Offset.Zero) }
    val shape = RoundedCornerShape(24.dp)
    Box(Modifier.fillMaxWidth().onGloballyPositioned { offset = it.positionInRoot() - origin }
        .clip(shape).border(1.dp, if (dark) Color.White.copy(alpha = .20f) else Color.White.copy(alpha = .7f), shape)) {
        // 패널 뒤 배경만 같은 좌표로 다시 그려 흐리고 콘텐츠는 별도 레이어에 둔다.
        Canvas(Modifier.matchParentSize().blur(12.dp)) { translate(-offset.x, -offset.y) { backdrop(full, dark) } }
        Column(Modifier.fillMaxWidth().background(if (dark) Color(0xFF182A3A).copy(alpha = .58f) else Color.White.copy(alpha = .52f))
            .padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp),
            horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally, content = content)
    }
}

@Composable
fun focusRing(): Modifier {
    var focused by remember { mutableStateOf(false) }
    return Modifier.onFocusChanged { focused = it.isFocused }.border(if (focused) 2.dp else 0.dp,
        if (focused) MaterialTheme.colorScheme.primary else Color.Transparent, RoundedCornerShape(20.dp))
}
