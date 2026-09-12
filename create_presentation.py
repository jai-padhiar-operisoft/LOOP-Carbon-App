"""
LOOP - HackOut'26 Presentation Generator
Creates an impressive, modern PowerPoint presentation
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor as RgbColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.oxml.ns import nsmap
from pptx.oxml import parse_xml
from pptx.enum.dml import MSO_THEME_COLOR
import os

# Brand Colors
DARK_BG = RgbColor(8, 11, 15)        # #080b0f
CARD_BG = RgbColor(17, 24, 39)       # #111827
GREEN_PRIMARY = RgbColor(34, 197, 94)  # #22c55e
GREEN_LIGHT = RgbColor(74, 222, 128)   # #4ade80
TEXT_PRIMARY = RgbColor(241, 245, 249)  # #f1f5f9
TEXT_SECONDARY = RgbColor(148, 163, 184)  # #94a3b8
RED_ALERT = RgbColor(239, 68, 68)      # #ef4444
ORANGE = RgbColor(249, 115, 22)        # #f97316
YELLOW = RgbColor(234, 179, 8)         # #eab308

def set_shape_gradient(shape, color1, color2, angle=90):
    """Set gradient fill on a shape"""
    fill = shape.fill
    fill.gradient()
    fill.gradient_angle = angle
    fill.gradient_stops[0].color.rgb = color1
    fill.gradient_stops[1].color.rgb = color2

def add_text_with_style(text_frame, text, font_size, bold=False, color=TEXT_PRIMARY, align=PP_ALIGN.LEFT):
    """Add styled text to a text frame"""
    p = text_frame.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.alignment = align
    p.font.name = "Segoe UI"

def add_paragraph(text_frame, text, font_size, bold=False, color=TEXT_PRIMARY, space_before=0, space_after=0):
    """Add a new paragraph with styling"""
    p = text_frame.add_paragraph()
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = "Segoe UI"
    p.space_before = Pt(space_before)
    p.space_after = Pt(space_after)
    return p

def create_slide_with_dark_bg(prs, layout_index=6):
    """Create a slide with dark background"""
    slide = prs.slides.add_slide(prs.slide_layouts[layout_index])
    
    # Add dark background
    background = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height
    )
    background.fill.solid()
    background.fill.fore_color.rgb = DARK_BG
    background.line.fill.background()
    
    # Send to back
    spTree = slide.shapes._spTree
    sp = background._element
    spTree.remove(sp)
    spTree.insert(2, sp)
    
    return slide

def add_icon_shape(slide, left, top, size, icon_type, color=GREEN_PRIMARY):
    """Add an icon-like shape based on type"""
    shape = None
    
    if icon_type == "tree":
        # Triangle for tree
        shape = slide.shapes.add_shape(MSO_SHAPE.ISOSCELES_TRIANGLE, left, top, size, size)
    elif icon_type == "car":
        shape = slide.shapes.add_shape(MSO_SHAPE.PENTAGON, left, top, size, size * 0.6)
    elif icon_type == "bolt":
        shape = slide.shapes.add_shape(MSO_SHAPE.LIGHTNING_BOLT, left, top, size, size)
    elif icon_type == "sun":
        shape = slide.shapes.add_shape(MSO_SHAPE.SUN, left, top, size, size)
    elif icon_type == "cloud":
        shape = slide.shapes.add_shape(MSO_SHAPE.CLOUD, left, top, size, size)
    elif icon_type == "star":
        shape = slide.shapes.add_shape(MSO_SHAPE.STAR_5_POINT, left, top, size, size)
    elif icon_type == "heart":
        shape = slide.shapes.add_shape(MSO_SHAPE.HEART, left, top, size, size)
    elif icon_type == "chart":
        shape = slide.shapes.add_shape(MSO_SHAPE.FLOWCHART_DOCUMENT, left, top, size, size)
    elif icon_type == "circle":
        shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, left, top, size, size)
    elif icon_type == "diamond":
        shape = slide.shapes.add_shape(MSO_SHAPE.DIAMOND, left, top, size, size)
    elif icon_type == "hexagon":
        shape = slide.shapes.add_shape(MSO_SHAPE.HEXAGON, left, top, size, size)
    elif icon_type == "arrow":
        shape = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, left, top, size, size * 0.5)
    elif icon_type == "plus":
        shape = slide.shapes.add_shape(MSO_SHAPE.CROSS, left, top, size, size)
    elif icon_type == "check":
        shape = slide.shapes.add_shape(MSO_SHAPE.FLOWCHART_EXTRACT, left, top, size, size)
    elif icon_type == "warning":
        shape = slide.shapes.add_shape(MSO_SHAPE.ISOSCELES_TRIANGLE, left, top, size, size)
    elif icon_type == "globe":
        shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, left, top, size, size)
    else:
        shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, left, top, size, size)
    
    if shape:
        shape.fill.solid()
        shape.fill.fore_color.rgb = color
        shape.line.fill.background()
    
    return shape

def add_stat_box(slide, left, top, width, height, number, label, color=GREEN_PRIMARY):
    """Add a stat card"""
    box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    box.fill.solid()
    box.fill.fore_color.rgb = CARD_BG
    box.line.color.rgb = RgbColor(30, 41, 59)
    box.line.width = Pt(1)
    
    # Number
    num_box = slide.shapes.add_textbox(left, top + Inches(0.15), width, Inches(0.6))
    tf = num_box.text_frame
    tf.word_wrap = False
    add_text_with_style(tf, number, 36, bold=True, color=color, align=PP_ALIGN.CENTER)
    
    # Label
    label_box = slide.shapes.add_textbox(left, top + Inches(0.65), width, Inches(0.4))
    tf = label_box.text_frame
    tf.word_wrap = True
    add_text_with_style(tf, label, 11, color=TEXT_SECONDARY, align=PP_ALIGN.CENTER)
    
    return box

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 1: Title Slide
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    # Decorative elements
    circle1 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(-2), Inches(-2), Inches(6), Inches(6))
    circle1.fill.solid()
    circle1.fill.fore_color.rgb = GREEN_PRIMARY
    circle1.fill.fore_color.brightness = 0.85
    circle1.line.fill.background()
    
    circle2 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(10), Inches(4), Inches(5), Inches(5))
    circle2.fill.solid()
    circle2.fill.fore_color.rgb = GREEN_LIGHT
    circle2.fill.fore_color.brightness = 0.9
    circle2.line.fill.background()
    
    # Logo/Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(2.5), Inches(11), Inches(1.5))
    tf = title_box.text_frame
    p = tf.paragraphs[0]
    p.text = "LOOP"
    p.font.size = Pt(96)
    p.font.bold = True
    p.font.color.rgb = TEXT_PRIMARY
    p.font.name = "Segoe UI"
    p.alignment = PP_ALIGN.CENTER
    
    # Subtitle
    sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(4.1), Inches(11), Inches(0.8))
    tf = sub_box.text_frame
    add_text_with_style(tf, "Your Carbon Mirror", 36, color=GREEN_PRIMARY, align=PP_ALIGN.CENTER)
    
    # Tagline
    tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(5), Inches(11), Inches(0.5))
    tf = tag_box.text_frame
    add_text_with_style(tf, "Not a carbon tracker. A carbon mirror that talks back.", 18, color=TEXT_SECONDARY, align=PP_ALIGN.CENTER)
    
    # Team/Event
    team_box = slide.shapes.add_textbox(Inches(0.8), Inches(6.5), Inches(11), Inches(0.4))
    tf = team_box.text_frame
    add_text_with_style(tf, "HackOut'26 | DAU Hackathon", 14, color=TEXT_SECONDARY, align=PP_ALIGN.CENTER)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 2: The Climate Reality Check
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    # Section label
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "THE REALITY", 12, bold=True, color=GREEN_PRIMARY)
    
    # Main headline
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11), Inches(1.2))
    tf = headline.text_frame
    add_text_with_style(tf, "We are running out of time.", 48, bold=True, color=TEXT_PRIMARY)
    
    # Big shocking stat
    stat_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.2), Inches(5.5), Inches(2.5))
    stat_box.fill.solid()
    stat_box.fill.fore_color.rgb = RgbColor(127, 29, 29)  # Dark red
    stat_box.line.fill.background()
    
    stat_num = slide.shapes.add_textbox(Inches(0.8), Inches(2.4), Inches(5.5), Inches(1.2))
    tf = stat_num.text_frame
    add_text_with_style(tf, "2030", 72, bold=True, color=RED_ALERT, align=PP_ALIGN.CENTER)
    
    stat_label = slide.shapes.add_textbox(Inches(0.8), Inches(3.6), Inches(5.5), Inches(1))
    tf = stat_label.text_frame
    tf.word_wrap = True
    add_text_with_style(tf, "Year we will breach 1.5°C warming\nThe point of no return", 18, color=TEXT_PRIMARY, align=PP_ALIGN.CENTER)
    
    # Supporting facts
    facts = [
        ("3.19 Billion", "Tonnes CO2 emitted by India in 2024"),
        ("165 Million", "Tonnes increase in just one year"),
        ("72%", "Of global emissions from household consumption"),
    ]
    
    start_x = Inches(6.8)
    for i, (num, label) in enumerate(facts):
        add_stat_box(slide, start_x, Inches(2.2 + i * 1.1), Inches(5.5), Inches(1), num, label, 
                    color=RED_ALERT if i == 1 else GREEN_PRIMARY)
    
    # Bottom insight
    insight = slide.shapes.add_textbox(Inches(0.8), Inches(6), Inches(11), Inches(0.8))
    tf = insight.text_frame
    tf.word_wrap = True
    add_text_with_style(tf, "India had the largest emission increase of any country in 2024. Individual action is no longer optional.", 16, color=TEXT_SECONDARY)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 3: The Real Problem
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "THE PROBLEM", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11), Inches(1))
    tf = headline.text_frame
    add_text_with_style(tf, "Most people have no idea where\ntheir carbon comes from.", 44, bold=True, color=TEXT_PRIMARY)
    
    # Problem cards
    problems = [
        ("eye", "No Visibility", "You know \"cars are bad\" but have no idea your Swiggy habit creates 2x the carbon."),
        ("edit", "Manual Entry Hell", "Existing apps need you to log every purchase. Nobody does that for more than 3 days."),
        ("globe", "Generic Advice", "\"Take public transport\" is useless if you live where there isn't any."),
        ("user", "Guilt Without Context", "Individual shaming without peer comparison doesn't change behavior."),
    ]
    
    for i, (icon_type, title, desc) in enumerate(problems):
        x = Inches(0.8 + (i % 2) * 6)
        y = Inches(2.4 + (i // 2) * 2.3)
        
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.7), Inches(2.1))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = RgbColor(239, 68, 68)
        card.line.color.brightness = 0.3
        card.line.width = Pt(1)
        
        # Icon circle
        icon_circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.25), y + Inches(0.25), Inches(0.5), Inches(0.5))
        icon_circle.fill.solid()
        icon_circle.fill.fore_color.rgb = RgbColor(127, 29, 29)
        icon_circle.line.fill.background()
        
        # Icon letter/symbol
        icon_text = slide.shapes.add_textbox(x + Inches(0.25), y + Inches(0.3), Inches(0.5), Inches(0.4))
        tf = icon_text.text_frame
        symbols = {"eye": "◉", "edit": "✎", "globe": "◎", "user": "●"}
        add_text_with_style(tf, symbols.get(icon_type, "●"), 18, bold=True, color=RED_ALERT, align=PP_ALIGN.CENTER)
        
        title_box = slide.shapes.add_textbox(x + Inches(0.9), y + Inches(0.3), Inches(4.5), Inches(0.5))
        tf = title_box.text_frame
        add_text_with_style(tf, title, 20, bold=True, color=TEXT_PRIMARY)
        
        desc_box = slide.shapes.add_textbox(x + Inches(0.3), y + Inches(1), Inches(5.1), Inches(1))
        tf = desc_box.text_frame
        tf.word_wrap = True
        add_text_with_style(tf, desc, 14, color=TEXT_SECONDARY)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 4: Introducing LOOP
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    # Decorative circle
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(8), Inches(-1), Inches(7), Inches(7))
    circle.fill.solid()
    circle.fill.fore_color.rgb = GREEN_PRIMARY
    circle.fill.fore_color.brightness = 0.85
    circle.line.fill.background()
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "THE SOLUTION", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(1), Inches(7), Inches(1.5))
    tf = headline.text_frame
    add_text_with_style(tf, "Introducing LOOP", 56, bold=True, color=TEXT_PRIMARY)
    
    tagline = slide.shapes.add_textbox(Inches(0.8), Inches(2.3), Inches(7), Inches(0.6))
    tf = tagline.text_frame
    add_text_with_style(tf, "Your personal carbon mirror.", 24, color=GREEN_LIGHT)
    
    # Key differentiators
    points = [
        "Upload your bank CSV. See your carbon in 30 seconds.",
        "AI classifies every transaction automatically.",
        "Get a score, a personality, and real comparisons.",
        "Actions tailored to YOUR city and YOUR spending.",
        "Compete with friends. Change together.",
    ]
    
    for i, point in enumerate(points):
        bullet = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.8), Inches(3.2 + i * 0.65), Inches(0.15), Inches(0.15))
        bullet.fill.solid()
        bullet.fill.fore_color.rgb = GREEN_PRIMARY
        bullet.line.fill.background()
        
        text = slide.shapes.add_textbox(Inches(1.1), Inches(3.1 + i * 0.65), Inches(6), Inches(0.5))
        tf = text.text_frame
        add_text_with_style(tf, point, 18, color=TEXT_PRIMARY)
    
    # Right side: Demo hint
    demo_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.3), Inches(3.5), Inches(4.2), Inches(2.8))
    demo_box.fill.solid()
    demo_box.fill.fore_color.rgb = CARD_BG
    demo_box.line.color.rgb = GREEN_PRIMARY
    demo_box.line.width = Pt(2)
    
    demo_text = slide.shapes.add_textbox(Inches(8.5), Inches(3.8), Inches(3.8), Inches(2.2))
    tf = demo_text.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Zero Manual Entry"
    p.font.size = Pt(22)
    p.font.bold = True
    p.font.color.rgb = GREEN_PRIMARY
    p.font.name = "Segoe UI"
    
    add_paragraph(tf, "Just export your bank statement.\nWe do the rest.", 16, color=TEXT_SECONDARY, space_before=12)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 5: How It Works
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "HOW IT WORKS", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11), Inches(0.8))
    tf = headline.text_frame
    add_text_with_style(tf, "From CSV to Carbon Score in 30 Seconds", 40, bold=True, color=TEXT_PRIMARY)
    
    steps = [
        ("01", "Upload", "Export CSV from your bank or UPI app. Drop it in LOOP."),
        ("02", "Classify", "AI categorizes every merchant into 14 carbon categories."),
        ("03", "Calculate", "Emission factors compute CO2 for each transaction."),
        ("04", "Reveal", "Your Loop Score, personality, and breakdown appear."),
    ]
    
    for i, (num, title, desc) in enumerate(steps):
        x = Inches(0.8 + i * 3.1)
        
        # Number circle
        num_circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, Inches(2.2), Inches(0.8), Inches(0.8))
        num_circle.fill.solid()
        num_circle.fill.fore_color.rgb = GREEN_PRIMARY
        num_circle.line.fill.background()
        
        num_text = slide.shapes.add_textbox(x, Inches(2.35), Inches(0.8), Inches(0.5))
        tf = num_text.text_frame
        add_text_with_style(tf, num, 20, bold=True, color=DARK_BG, align=PP_ALIGN.CENTER)
        
        # Arrow (except last)
        if i < 3:
            arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, x + Inches(1), Inches(2.4), Inches(1.8), Inches(0.4))
            arrow.fill.solid()
            arrow.fill.fore_color.rgb = GREEN_PRIMARY
            arrow.fill.fore_color.brightness = 0.5
            arrow.line.fill.background()
        
        # Title
        title_box = slide.shapes.add_textbox(x, Inches(3.2), Inches(2.8), Inches(0.5))
        tf = title_box.text_frame
        add_text_with_style(tf, title, 24, bold=True, color=TEXT_PRIMARY)
        
        # Description
        desc_box = slide.shapes.add_textbox(x, Inches(3.7), Inches(2.8), Inches(1.2))
        tf = desc_box.text_frame
        tf.word_wrap = True
        add_text_with_style(tf, desc, 14, color=TEXT_SECONDARY)
    
    # Tech stack
    tech_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.3), Inches(11.7), Inches(1.5))
    tech_box.fill.solid()
    tech_box.fill.fore_color.rgb = CARD_BG
    tech_box.line.color.rgb = RgbColor(30, 41, 59)
    tech_box.line.width = Pt(1)
    
    tech_label = slide.shapes.add_textbox(Inches(1), Inches(5.5), Inches(2), Inches(0.4))
    tf = tech_label.text_frame
    add_text_with_style(tf, "TECH STACK", 11, bold=True, color=GREEN_PRIMARY)
    
    tech_items = ["Next.js 16", "FastAPI", "SQLite", "OpenRouter AI", "Recharts", "Leaflet Maps"]
    for i, tech in enumerate(tech_items):
        pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1 + i * 1.9), Inches(6), Inches(1.7), Inches(0.5))
        pill.fill.solid()
        pill.fill.fore_color.rgb = RgbColor(30, 41, 59)
        pill.line.color.rgb = GREEN_PRIMARY
        pill.line.color.brightness = 0.3
        pill.line.width = Pt(1)
        
        pill_text = slide.shapes.add_textbox(Inches(1 + i * 1.9), Inches(6.05), Inches(1.7), Inches(0.4))
        tf = pill_text.text_frame
        add_text_with_style(tf, tech, 12, color=TEXT_PRIMARY, align=PP_ALIGN.CENTER)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 6: The Science
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "THE SCIENCE", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11), Inches(0.8))
    tf = headline.text_frame
    add_text_with_style(tf, "Emission Factors by Category", 40, bold=True, color=TEXT_PRIMARY)
    
    subtitle = slide.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11), Inches(0.5))
    tf = subtitle.text_frame
    add_text_with_style(tf, "Based on GHG Protocol and DEFRA standards, adapted for Indian consumption", 16, color=TEXT_SECONDARY)
    
    # Category bars
    categories = [
        ("Flights", 0.0035, RED_ALERT),
        ("Fuel", 0.0025, ORANGE),
        ("Electronics", 0.0015, YELLOW),
        ("Ride Hailing", 0.0012, YELLOW),
        ("Electricity", 0.00082, GREEN_LIGHT),
        ("Food Delivery", 0.0008, GREEN_LIGHT),
        ("Fashion", 0.0006, GREEN_PRIMARY),
        ("Public Transport", 0.00015, GREEN_PRIMARY),
    ]
    
    max_factor = 0.0035
    for i, (cat, factor, color) in enumerate(categories):
        y = Inches(2.3 + i * 0.6)
        
        # Label
        cat_label = slide.shapes.add_textbox(Inches(0.8), y, Inches(2.2), Inches(0.4))
        tf = cat_label.text_frame
        add_text_with_style(tf, cat, 14, color=TEXT_PRIMARY)
        
        # Bar background
        bar_bg = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3.2), y + Inches(0.05), Inches(7), Inches(0.35))
        bar_bg.fill.solid()
        bar_bg.fill.fore_color.rgb = RgbColor(30, 41, 59)
        bar_bg.line.fill.background()
        
        # Bar fill
        bar_width = (factor / max_factor) * 7
        bar_fill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3.2), y + Inches(0.05), Inches(bar_width), Inches(0.35))
        bar_fill.fill.solid()
        bar_fill.fill.fore_color.rgb = color
        bar_fill.line.fill.background()
        
        # Factor value
        factor_text = slide.shapes.add_textbox(Inches(10.5), y, Inches(2), Inches(0.4))
        tf = factor_text.text_frame
        add_text_with_style(tf, f"{factor} kg/₹", 12, color=TEXT_SECONDARY, align=PP_ALIGN.RIGHT)
    
    # Formula box
    formula_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.5), Inches(11.7), Inches(0.7))
    formula_box.fill.solid()
    formula_box.fill.fore_color.rgb = CARD_BG
    formula_box.line.color.rgb = GREEN_PRIMARY
    formula_box.line.width = Pt(1)
    
    formula = slide.shapes.add_textbox(Inches(0.8), Inches(6.6), Inches(11.7), Inches(0.5))
    tf = formula.text_frame
    add_text_with_style(tf, "CO₂ (kg)  =  Amount Spent (₹)  ×  Emission Factor       |       Example: ₹500 Swiggy = 0.4 kg CO₂", 16, color=TEXT_PRIMARY, align=PP_ALIGN.CENTER)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 7: Loop Score & Personalities
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "GAMIFICATION", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(6), Inches(0.8))
    tf = headline.text_frame
    add_text_with_style(tf, "Loop Score & Personalities", 40, bold=True, color=TEXT_PRIMARY)
    
    # Score explanation
    exp_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.7), Inches(5.5), Inches(1))
    tf = exp_box.text_frame
    tf.word_wrap = True
    add_text_with_style(tf, "Your Loop Score (0-1000) is benchmarked against others in your city. Higher score = lower relative footprint.", 16, color=TEXT_SECONDARY)
    
    # Personality cards
    personalities = [
        ("Green Pioneer", "801-1000", "#10b981", "Leading by example"),
        ("Conscious Optimizer", "651-800", "#22c55e", "Sustainability is lifestyle"),
        ("Mindful Consumer", "501-650", "#84cc16", "Above average"),
        ("Convenience Consumer", "351-500", "#eab308", "Aware but inconsistent"),
        ("Habitual Spender", "201-350", "#f97316", "Convenient but heavy"),
        ("Carbon Heavy", "0-200", "#ef4444", "Biggest wins ahead"),
    ]
    
    for i, (name, score, color_hex, desc) in enumerate(personalities):
        x = Inches(0.8 + (i % 3) * 4.1)
        y = Inches(3 + (i // 3) * 2)
        
        color = RgbColor(int(color_hex[1:3], 16), int(color_hex[3:5], 16), int(color_hex[5:7], 16))
        
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.8), Inches(1.7))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = color
        card.line.width = Pt(2)
        
        # Color accent bar
        accent = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, Inches(0.15), Inches(1.7))
        accent.fill.solid()
        accent.fill.fore_color.rgb = color
        accent.line.fill.background()
        
        name_box = slide.shapes.add_textbox(x + Inches(0.3), y + Inches(0.25), Inches(3.3), Inches(0.5))
        tf = name_box.text_frame
        add_text_with_style(tf, name, 18, bold=True, color=TEXT_PRIMARY)
        
        score_box = slide.shapes.add_textbox(x + Inches(0.3), y + Inches(0.7), Inches(3.3), Inches(0.4))
        tf = score_box.text_frame
        add_text_with_style(tf, f"Score: {score}", 14, color=color)
        
        desc_box = slide.shapes.add_textbox(x + Inches(0.3), y + Inches(1.1), Inches(3.3), Inches(0.5))
        tf = desc_box.text_frame
        add_text_with_style(tf, desc, 12, color=TEXT_SECONDARY)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 8: Impact Equivalents
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "REAL-WORLD IMPACT", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11), Inches(0.8))
    tf = headline.text_frame
    add_text_with_style(tf, "What 65 kg CO₂ Actually Looks Like", 40, bold=True, color=TEXT_PRIMARY)
    
    subtitle = slide.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11), Inches(0.5))
    tf = subtitle.text_frame
    add_text_with_style(tf, "India-relevant equivalents that make carbon tangible", 16, color=TEXT_SECONDARY)
    
    equivalents = [
        ("▲", "3", "trees needed", "to offset/month", GREEN_PRIMARY),
        ("◆", "310", "km driven", "by petrol car", ORANGE),
        ("●", "433", "auto rides", "5km each", YELLOW),
        ("◉", "3,095", "chai cups", "cutting chai", RgbColor(217, 119, 6)),
        ("✦", "72", "AC hours", "1.5 ton AC", RgbColor(59, 130, 246)),
        ("■", "18", "pizza orders", "medium pizza", RED_ALERT),
    ]
    
    for i, (symbol, num, label_text, sub, color) in enumerate(equivalents):
        x = Inches(0.8 + (i % 3) * 4.1)
        y = Inches(2.3 + (i // 3) * 2.3)
        
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.8), Inches(2))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = RgbColor(30, 41, 59)
        card.line.width = Pt(1)
        
        # Icon circle with symbol
        icon_circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.25), y + Inches(0.4), Inches(0.6), Inches(0.6))
        icon_circle.fill.solid()
        icon_circle.fill.fore_color.rgb = color
        icon_circle.fill.fore_color.brightness = 0.7
        icon_circle.line.fill.background()
        
        symbol_box = slide.shapes.add_textbox(x + Inches(0.25), y + Inches(0.5), Inches(0.6), Inches(0.5))
        tf = symbol_box.text_frame
        add_text_with_style(tf, symbol, 18, bold=True, color=color, align=PP_ALIGN.CENTER)
        
        num_box = slide.shapes.add_textbox(x + Inches(1), y + Inches(0.25), Inches(2.5), Inches(0.7))
        tf = num_box.text_frame
        add_text_with_style(tf, num, 36, bold=True, color=color)
        
        label_box = slide.shapes.add_textbox(x + Inches(1), y + Inches(0.95), Inches(2.5), Inches(0.4))
        tf = label_box.text_frame
        add_text_with_style(tf, label_text, 14, bold=True, color=TEXT_PRIMARY)
        
        sub_box = slide.shapes.add_textbox(x + Inches(1), y + Inches(1.35), Inches(2.5), Inches(0.4))
        tf = sub_box.text_frame
        add_text_with_style(tf, sub, 12, color=TEXT_SECONDARY)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 9: Key Features
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "FEATURES", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11), Inches(0.8))
    tf = headline.text_frame
    add_text_with_style(tf, "Everything You Need to Track & Reduce", 40, bold=True, color=TEXT_PRIMARY)
    
    features = [
        ("◉", "Auto CSV Parsing", "Upload any bank/UPI CSV. AI reads and classifies every transaction.", GREEN_PRIMARY),
        ("★", "Carbon Personality", "6 evolving personas based on your score. Not a number, a story.", GREEN_LIGHT),
        ("▦", "Carbon Calendar", "GitHub-style heatmap showing daily CO2 intensity.", RgbColor(59, 130, 246)),
        ("▲", "City Rankings", "See your percentile among all LOOP users in your city.", YELLOW),
        ("◎", "Local Action Map", "Recycling centers, e-waste drops, repair cafes near you.", RgbColor(20, 184, 166)),
        ("◈", "AI Carbon Story", "Weekly narrative written by AI. Specific, honest, actionable.", RgbColor(139, 92, 246)),
        ("●●", "Social Circles", "Create groups with friends. Compete on leaderboards.", RgbColor(236, 72, 153)),
        ("✎", "Manual Logger", "Quick-add buttons for common expenses. No CSV needed.", ORANGE),
        ("✦", "Milestones", "9 achievement badges. Gamified progress tracking.", RgbColor(251, 191, 36)),
    ]
    
    for i, (symbol, title, desc, color) in enumerate(features):
        col = i % 3
        row = i // 3
        x = Inches(0.8 + col * 4.1)
        y = Inches(1.8 + row * 1.85)
        
        # Feature card
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.8), Inches(1.65))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = RgbColor(30, 41, 59)
        card.line.width = Pt(1)
        
        # Icon circle
        icon_circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.15), y + Inches(0.15), Inches(0.45), Inches(0.45))
        icon_circle.fill.solid()
        icon_circle.fill.fore_color.rgb = color
        icon_circle.fill.fore_color.brightness = 0.7
        icon_circle.line.fill.background()
        
        symbol_box = slide.shapes.add_textbox(x + Inches(0.15), y + Inches(0.22), Inches(0.45), Inches(0.35))
        tf = symbol_box.text_frame
        add_text_with_style(tf, symbol, 14, bold=True, color=color, align=PP_ALIGN.CENTER)
        
        title_box = slide.shapes.add_textbox(x + Inches(0.7), y + Inches(0.2), Inches(2.9), Inches(0.4))
        tf = title_box.text_frame
        add_text_with_style(tf, title, 16, bold=True, color=TEXT_PRIMARY)
        
        desc_box = slide.shapes.add_textbox(x + Inches(0.2), y + Inches(0.7), Inches(3.4), Inches(0.85))
        tf = desc_box.text_frame
        tf.word_wrap = True
        add_text_with_style(tf, desc, 12, color=TEXT_SECONDARY)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 10: Demo Screenshots Placeholder
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "LIVE DEMO", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11), Inches(0.8))
    tf = headline.text_frame
    add_text_with_style(tf, "See LOOP in Action", 40, bold=True, color=TEXT_PRIMARY)
    
    # Demo placeholder boxes
    demos = [
        ("Dashboard", "Score, personality, breakdown charts"),
        ("Action Map", "Local recycling & repair points"),
        ("Circles", "Social leaderboards"),
    ]
    
    for i, (title, desc) in enumerate(demos):
        x = Inches(0.8 + i * 4.1)
        
        # Screenshot placeholder
        placeholder = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.9), Inches(3.8), Inches(4))
        placeholder.fill.solid()
        placeholder.fill.fore_color.rgb = CARD_BG
        placeholder.line.color.rgb = GREEN_PRIMARY
        placeholder.line.width = Pt(2)
        
        # Demo indicator
        demo_text = slide.shapes.add_textbox(x, Inches(3.5), Inches(3.8), Inches(0.5))
        tf = demo_text.text_frame
        add_text_with_style(tf, "[LIVE DEMO]", 14, color=GREEN_PRIMARY, align=PP_ALIGN.CENTER)
        
        title_box = slide.shapes.add_textbox(x, Inches(6), Inches(3.8), Inches(0.5))
        tf = title_box.text_frame
        add_text_with_style(tf, title, 18, bold=True, color=TEXT_PRIMARY, align=PP_ALIGN.CENTER)
        
        desc_box = slide.shapes.add_textbox(x, Inches(6.45), Inches(3.8), Inches(0.5))
        tf = desc_box.text_frame
        add_text_with_style(tf, desc, 12, color=TEXT_SECONDARY, align=PP_ALIGN.CENTER)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 11: Impact & Metrics
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "IMPACT", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11), Inches(0.8))
    tf = headline.text_frame
    add_text_with_style(tf, "Driving Real Behavior Change", 40, bold=True, color=TEXT_PRIMARY)
    
    # Big stats
    stats = [
        ("10-15%", "Emission Reduction", "Average reduction by users who track carbon", GREEN_PRIMARY),
        ("3x", "Engagement", "Social comparison increases engagement over solo tracking", GREEN_LIGHT),
        ("5x", "Retention", "Gamification improves retention vs basic tracking apps", GREEN_PRIMARY),
    ]
    
    for i, (num, title, desc, color) in enumerate(stats):
        x = Inches(0.8 + i * 4.1)
        
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.9), Inches(3.8), Inches(2.3))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = color
        card.line.width = Pt(2)
        
        num_box = slide.shapes.add_textbox(x, Inches(2.1), Inches(3.8), Inches(1))
        tf = num_box.text_frame
        add_text_with_style(tf, num, 48, bold=True, color=color, align=PP_ALIGN.CENTER)
        
        title_box = slide.shapes.add_textbox(x, Inches(3.1), Inches(3.8), Inches(0.5))
        tf = title_box.text_frame
        add_text_with_style(tf, title, 18, bold=True, color=TEXT_PRIMARY, align=PP_ALIGN.CENTER)
        
        desc_box = slide.shapes.add_textbox(x + Inches(0.2), Inches(3.6), Inches(3.4), Inches(0.6))
        tf = desc_box.text_frame
        tf.word_wrap = True
        add_text_with_style(tf, desc, 12, color=TEXT_SECONDARY, align=PP_ALIGN.CENTER)
    
    # How we drive change
    change_headline = slide.shapes.add_textbox(Inches(0.8), Inches(4.5), Inches(11), Inches(0.5))
    tf = change_headline.text_frame
    add_text_with_style(tf, "Three Levels of Impact", 20, bold=True, color=TEXT_PRIMARY)
    
    levels = [
        ("Individual", "Awareness of where carbon comes from. Actionable insights specific to spending."),
        ("Social", "City rankings and friend circles create healthy competition and accountability."),
        ("Systemic", "Aggregated data reveals consumption patterns. Connects users to local solutions."),
    ]
    
    for i, (level, desc) in enumerate(levels):
        x = Inches(0.8 + i * 4.1)
        
        level_box = slide.shapes.add_textbox(x, Inches(5.1), Inches(3.8), Inches(0.4))
        tf = level_box.text_frame
        add_text_with_style(tf, level, 16, bold=True, color=GREEN_PRIMARY)
        
        desc_box = slide.shapes.add_textbox(x, Inches(5.5), Inches(3.8), Inches(1.2))
        tf = desc_box.text_frame
        tf.word_wrap = True
        add_text_with_style(tf, desc, 13, color=TEXT_SECONDARY)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 12: Why LOOP Wins
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "COMPETITIVE EDGE", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11), Inches(0.8))
    tf = headline.text_frame
    add_text_with_style(tf, "Why LOOP is Different", 40, bold=True, color=TEXT_PRIMARY)
    
    # Comparison table header
    headers = ["Feature", "Other Apps", "LOOP"]
    header_widths = [Inches(4), Inches(3.5), Inches(3.5)]
    x_positions = [Inches(0.8), Inches(5), Inches(8.7)]
    
    for i, (header, width, x) in enumerate(zip(headers, header_widths, x_positions)):
        header_box = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(1.9), width, Inches(0.6))
        header_box.fill.solid()
        header_box.fill.fore_color.rgb = CARD_BG
        header_box.line.fill.background()
        
        header_text = slide.shapes.add_textbox(x, Inches(2), width, Inches(0.5))
        tf = header_text.text_frame
        color = GREEN_PRIMARY if i == 2 else TEXT_PRIMARY
        add_text_with_style(tf, header, 14, bold=True, color=color, align=PP_ALIGN.CENTER)
    
    # Comparison rows
    comparisons = [
        ("Data Entry", "Manual logging", "Auto CSV parsing"),
        ("Benchmarking", "Global averages", "City-specific peers"),
        ("Suggestions", "Generic tips", "City + spending filtered"),
        ("Social", "None", "Circles & leaderboards"),
        ("Personality", "Just numbers", "6 evolving personas"),
        ("AI Features", "Basic", "LLM classification + stories"),
    ]
    
    for i, (feature, other, loop) in enumerate(comparisons):
        y = Inches(2.6 + i * 0.7)
        
        # Feature name
        feat_box = slide.shapes.add_textbox(Inches(0.8), y, Inches(4), Inches(0.5))
        tf = feat_box.text_frame
        add_text_with_style(tf, feature, 14, color=TEXT_PRIMARY)
        
        # Other apps (red-ish)
        other_box = slide.shapes.add_textbox(Inches(5), y, Inches(3.5), Inches(0.5))
        tf = other_box.text_frame
        add_text_with_style(tf, f"✗ {other}", 13, color=TEXT_SECONDARY, align=PP_ALIGN.CENTER)
        
        # LOOP (green)
        loop_box = slide.shapes.add_textbox(Inches(8.7), y, Inches(3.5), Inches(0.5))
        tf = loop_box.text_frame
        add_text_with_style(tf, f"✓ {loop}", 13, color=GREEN_PRIMARY, align=PP_ALIGN.CENTER)
        
        # Divider
        if i < len(comparisons) - 1:
            divider = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), y + Inches(0.55), Inches(11.4), Pt(1))
            divider.fill.solid()
            divider.fill.fore_color.rgb = RgbColor(30, 41, 59)
            divider.line.fill.background()
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 13: Security & Anti-Cheat
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "SECURITY & INTEGRITY", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11), Inches(0.8))
    tf = headline.text_frame
    add_text_with_style(tf, "Built to Prevent Gaming the System", 40, bold=True, color=TEXT_PRIMARY)
    
    subtitle = slide.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11), Inches(0.5))
    tf = subtitle.text_frame
    add_text_with_style(tf, "Leaderboards are only meaningful if they cannot be cheated", 16, color=TEXT_SECONDARY)
    
    # Security Feature 1: CSV Hash Verification
    card1 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.3), Inches(5.7), Inches(2.2))
    card1.fill.solid()
    card1.fill.fore_color.rgb = CARD_BG
    card1.line.color.rgb = GREEN_PRIMARY
    card1.line.width = Pt(2)
    
    # Icon for hash
    hash_icon = slide.shapes.add_shape(MSO_SHAPE.HEXAGON, Inches(1.1), Inches(2.6), Inches(0.6), Inches(0.6))
    hash_icon.fill.solid()
    hash_icon.fill.fore_color.rgb = GREEN_PRIMARY
    hash_icon.fill.fore_color.brightness = 0.7
    hash_icon.line.fill.background()
    
    hash_symbol = slide.shapes.add_textbox(Inches(1.1), Inches(2.7), Inches(0.6), Inches(0.5))
    tf = hash_symbol.text_frame
    add_text_with_style(tf, "#", 20, bold=True, color=GREEN_PRIMARY, align=PP_ALIGN.CENTER)
    
    title1 = slide.shapes.add_textbox(Inches(1.9), Inches(2.55), Inches(4.3), Inches(0.5))
    tf = title1.text_frame
    add_text_with_style(tf, "SHA-256 CSV Hash Verification", 18, bold=True, color=TEXT_PRIMARY)
    
    desc1_box = slide.shapes.add_textbox(Inches(1.1), Inches(3.3), Inches(5.1), Inches(1.1))
    tf = desc1_box.text_frame
    tf.word_wrap = True
    add_text_with_style(tf, "Every uploaded CSV is hashed using SHA-256. If a user tries to re-upload the same file (even with a different filename), the system detects it and blocks the upload. This prevents users from inflating their scores by uploading the same transactions multiple times.", 13, color=TEXT_SECONDARY)
    
    # Security Feature 2: OTP Authentication
    card2 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(2.3), Inches(5.7), Inches(2.2))
    card2.fill.solid()
    card2.fill.fore_color.rgb = CARD_BG
    card2.line.color.rgb = RgbColor(139, 92, 246)
    card2.line.width = Pt(2)
    
    # Icon for OTP
    otp_icon = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(7.1), Inches(2.6), Inches(0.6), Inches(0.6))
    otp_icon.fill.solid()
    otp_icon.fill.fore_color.rgb = RgbColor(139, 92, 246)
    otp_icon.fill.fore_color.brightness = 0.7
    otp_icon.line.fill.background()
    
    otp_symbol = slide.shapes.add_textbox(Inches(7.1), Inches(2.7), Inches(0.6), Inches(0.5))
    tf = otp_symbol.text_frame
    add_text_with_style(tf, "✓", 20, bold=True, color=RgbColor(139, 92, 246), align=PP_ALIGN.CENTER)
    
    title2 = slide.shapes.add_textbox(Inches(7.9), Inches(2.55), Inches(4.3), Inches(0.5))
    tf = title2.text_frame
    add_text_with_style(tf, "OTP Email Verification", 18, bold=True, color=TEXT_PRIMARY)
    
    desc2_box = slide.shapes.add_textbox(Inches(7.1), Inches(3.3), Inches(5.1), Inches(1.1))
    tf = desc2_box.text_frame
    tf.word_wrap = True
    add_text_with_style(tf, "All user accounts require email verification via one-time password (OTP). This prevents bot account creation and ensures each user on the leaderboard is a real person with a verified email address.", 13, color=TEXT_SECONDARY)
    
    # How it works section
    how_label = slide.shapes.add_textbox(Inches(0.8), Inches(4.8), Inches(11), Inches(0.4))
    tf = how_label.text_frame
    add_text_with_style(tf, "How It Protects Leaderboard Integrity", 18, bold=True, color=TEXT_PRIMARY)
    
    protections = [
        ("◉", "Duplicate Detection", "Same CSV content = blocked, regardless of filename"),
        ("◉", "Real Users Only", "Email OTP verification prevents fake accounts"),
        ("◉", "Fair Competition", "Rankings reflect actual behavior, not gaming"),
    ]
    
    for i, (symbol, title, desc) in enumerate(protections):
        x = Inches(0.8 + i * 4.1)
        
        prot_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(5.3), Inches(3.8), Inches(1.3))
        prot_card.fill.solid()
        prot_card.fill.fore_color.rgb = RgbColor(20, 30, 45)
        prot_card.line.color.rgb = RgbColor(30, 41, 59)
        prot_card.line.width = Pt(1)
        
        sym_box = slide.shapes.add_textbox(x + Inches(0.2), Inches(5.45), Inches(0.4), Inches(0.4))
        tf = sym_box.text_frame
        add_text_with_style(tf, symbol, 16, bold=True, color=GREEN_PRIMARY)
        
        title_box = slide.shapes.add_textbox(x + Inches(0.5), Inches(5.45), Inches(3.1), Inches(0.4))
        tf = title_box.text_frame
        add_text_with_style(tf, title, 14, bold=True, color=TEXT_PRIMARY)
        
        desc_box = slide.shapes.add_textbox(x + Inches(0.2), Inches(5.9), Inches(3.4), Inches(0.6))
        tf = desc_box.text_frame
        tf.word_wrap = True
        add_text_with_style(tf, desc, 11, color=TEXT_SECONDARY)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 14: Future Roadmap
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    label = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(3), Inches(0.4))
    tf = label.text_frame
    add_text_with_style(tf, "ROADMAP", 12, bold=True, color=GREEN_PRIMARY)
    
    headline = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11), Inches(0.8))
    tf = headline.text_frame
    add_text_with_style(tf, "What's Next for LOOP", 40, bold=True, color=TEXT_PRIMARY)
    
    roadmap = [
        ("Now", "Core Platform", ["CSV parsing & AI classification", "Loop Score & personalities", "City rankings & circles", "Manual expense logging"]),
        ("Next", "Enhancements", ["Bank API integration (no CSV needed)", "Carbon offset marketplace", "Corporate team features", "Mobile app (iOS/Android)"]),
        ("Future", "Scale", ["Pan-India expansion", "Regional language support", "Government partnerships", "Carbon credit integration"]),
    ]
    
    for i, (phase, title, items) in enumerate(roadmap):
        x = Inches(0.8 + i * 4.1)
        
        # Phase indicator
        phase_circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, Inches(2), Inches(0.8), Inches(0.8))
        phase_circle.fill.solid()
        phase_circle.fill.fore_color.rgb = GREEN_PRIMARY if i == 0 else CARD_BG
        phase_circle.line.color.rgb = GREEN_PRIMARY
        phase_circle.line.width = Pt(2)
        
        phase_text = slide.shapes.add_textbox(x, Inches(2.15), Inches(0.8), Inches(0.5))
        tf = phase_text.text_frame
        color = DARK_BG if i == 0 else GREEN_PRIMARY
        add_text_with_style(tf, phase, 11, bold=True, color=color, align=PP_ALIGN.CENTER)
        
        # Connector line
        if i < 2:
            line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x + Inches(0.9), Inches(2.35), Inches(3.1), Pt(2))
            line.fill.solid()
            line.fill.fore_color.rgb = GREEN_PRIMARY
            line.fill.fore_color.brightness = 0.3
            line.line.fill.background()
        
        # Title
        title_box = slide.shapes.add_textbox(x, Inches(2.9), Inches(3.8), Inches(0.5))
        tf = title_box.text_frame
        add_text_with_style(tf, title, 20, bold=True, color=TEXT_PRIMARY)
        
        # Items
        for j, item in enumerate(items):
            bullet = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, Inches(3.5 + j * 0.55), Inches(0.12), Inches(0.12))
            bullet.fill.solid()
            bullet.fill.fore_color.rgb = GREEN_PRIMARY
            bullet.line.fill.background()
            
            item_text = slide.shapes.add_textbox(x + Inches(0.25), Inches(3.4 + j * 0.55), Inches(3.5), Inches(0.5))
            tf = item_text.text_frame
            add_text_with_style(tf, item, 13, color=TEXT_SECONDARY)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SLIDE 15: Call to Action / Thank You
    # ═══════════════════════════════════════════════════════════════════════════
    slide = create_slide_with_dark_bg(prs)
    
    # Decorative circles
    circle1 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(-3), Inches(-3), Inches(8), Inches(8))
    circle1.fill.solid()
    circle1.fill.fore_color.rgb = GREEN_PRIMARY
    circle1.fill.fore_color.brightness = 0.85
    circle1.line.fill.background()
    
    circle2 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(9), Inches(3), Inches(6), Inches(6))
    circle2.fill.solid()
    circle2.fill.fore_color.rgb = GREEN_LIGHT
    circle2.fill.fore_color.brightness = 0.9
    circle2.line.fill.background()
    
    # Main message
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(2.2), Inches(11.7), Inches(1.5))
    tf = title_box.text_frame
    add_text_with_style(tf, "Close the Loop.", 64, bold=True, color=TEXT_PRIMARY, align=PP_ALIGN.CENTER)
    
    subtitle = slide.shapes.add_textbox(Inches(0.8), Inches(3.6), Inches(11.7), Inches(0.8))
    tf = subtitle.text_frame
    add_text_with_style(tf, "See your impact. Understand it. Change it.", 28, color=GREEN_PRIMARY, align=PP_ALIGN.CENTER)
    
    # CTA
    cta_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(4.5), Inches(4.8), Inches(4.3), Inches(0.8))
    cta_box.fill.solid()
    cta_box.fill.fore_color.rgb = GREEN_PRIMARY
    cta_box.line.fill.background()
    
    cta_text = slide.shapes.add_textbox(Inches(4.5), Inches(4.95), Inches(4.3), Inches(0.5))
    tf = cta_text.text_frame
    add_text_with_style(tf, "Try LOOP Today", 20, bold=True, color=DARK_BG, align=PP_ALIGN.CENTER)
    
    # Footer
    footer = slide.shapes.add_textbox(Inches(0.8), Inches(6.3), Inches(11.7), Inches(0.6))
    tf = footer.text_frame
    add_text_with_style(tf, "Thank you!", 24, bold=True, color=TEXT_PRIMARY, align=PP_ALIGN.CENTER)
    
    sub_footer = slide.shapes.add_textbox(Inches(0.8), Inches(6.8), Inches(11.7), Inches(0.4))
    tf = sub_footer.text_frame
    add_text_with_style(tf, "HackOut'26 | DAU Hackathon", 14, color=TEXT_SECONDARY, align=PP_ALIGN.CENTER)
    
    # Save the presentation
    output_path = os.path.join(os.path.dirname(__file__), "LOOP_Presentation.pptx")
    prs.save(output_path)
    print(f"Presentation saved to: {output_path}")
    return output_path

if __name__ == "__main__":
    create_presentation()
