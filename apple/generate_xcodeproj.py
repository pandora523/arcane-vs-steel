#!/usr/bin/env python3
"""
Deterministic Xcode multiplatform project generator for Arcane vs. Steel (iOS + macOS).
Generates `apple/ArcaneVsSteel.xcodeproj/project.pbxproj` and shared scheme `ArcaneVsSteel`.
Bundles the exact, untouched original game (`../index.html`, `../style.css`, `../manifest.json`,
`../src`, `../assets`) as read-only bundle references with 100% lossless PNG preservation
(`COMPRESS_PNG_FILES = NO`, `STRIP_PNG_TEXT = NO`) while leaving the root Web/Vercel build untouched.
"""

import hashlib
from pathlib import Path

APPLE_DIR = Path(__file__).resolve().parent
SRC_ROOT = APPLE_DIR / "ArcaneVsSteel"
XCODEPROJ_DIR = APPLE_DIR / "ArcaneVsSteel.xcodeproj"
SCHEMES_DIR = XCODEPROJ_DIR / "xcshareddata" / "xcschemes"


def pbx_id(seed: str) -> str:
    return hashlib.sha1(f"ArcaneVsSteel::{seed}".encode("utf-8")).hexdigest()[:24].upper()


def generate() -> None:
    XCODEPROJ_DIR.mkdir(parents=True, exist_ok=True)
    SCHEMES_DIR.mkdir(parents=True, exist_ok=True)

    groups = ["App", "Core", "Metal", "UI"]
    source_entries = []
    for grp in groups:
        grp_dir = SRC_ROOT / grp
        if not grp_dir.exists():
            continue
        for p in sorted(grp_dir.iterdir()):
            if p.suffix == ".swift":
                source_entries.append((grp, p.name, f"ArcaneVsSteel/{grp}/{p.name}", "sourcecode.swift"))
            elif p.suffix == ".metal":
                source_entries.append((grp, p.name, f"ArcaneVsSteel/{grp}/{p.name}", "file.metal"))

    proj_id = pbx_id("PBXProject")
    main_group_id = pbx_id("MainGroup")
    src_group_id = pbx_id("SourceGroup:ArcaneVsSteel")
    web_group_id = pbx_id("SharedGameRuntimeGroup")
    products_group_id = pbx_id("ProductsGroup")

    target_id = pbx_id("NativeTarget:ArcaneVsSteel")
    product_ref_id = pbx_id("ProductRef:ArcaneVsSteel.app")
    sources_phase_id = pbx_id("SourcesBuildPhase")
    frameworks_phase_id = pbx_id("FrameworksBuildPhase")
    resources_phase_id = pbx_id("ResourcesBuildPhase")

    proj_cfg_list_id = pbx_id("ConfigList:Project")
    proj_debug_id = pbx_id("BuildConfig:Project:Debug")
    proj_release_id = pbx_id("BuildConfig:Project:Release")

    tgt_cfg_list_id = pbx_id("ConfigList:Target")
    tgt_debug_id = pbx_id("BuildConfig:Target:Debug")
    tgt_release_id = pbx_id("BuildConfig:Target:Release")

    infoplist_file_id = pbx_id("FileRef:Info.plist")
    xcassets_file_id = pbx_id("FileRef:Assets.xcassets")
    xcassets_build_id = pbx_id("BuildFile:Assets.xcassets")

    # Read-only references to the exact original game runtime & lossless assets
    shared_bundle_items = [
        ("index.html", "../index.html", "text.html"),
        ("style.css", "../style.css", "text.css"),
        ("manifest.json", "../manifest.json", "text.json"),
        ("src", "../src", "folder"),
        ("assets", "../assets", "folder"),
    ]

    group_ids = {grp: pbx_id(f"Group:{grp}") for grp in groups}
    group_children = {grp: [] for grp in groups}

    build_file_lines = []
    file_ref_lines = []
    source_build_ids = []
    resource_build_ids = [(xcassets_build_id, "Assets.xcassets")]
    shared_group_children = []

    for grp, fname, rel_path, ftype in source_entries:
        f_id = pbx_id(f"FileRef:{rel_path}")
        b_id = pbx_id(f"BuildFile:{rel_path}")
        group_children[grp].append((f_id, fname))
        source_build_ids.append((b_id, fname))
        build_file_lines.append(
            f"\t\t{b_id} /* {fname} in Sources */ = {{isa = PBXBuildFile; fileRef = {f_id} /* {fname} */; }};"
        )
        file_ref_lines.append(
            f"\t\t{f_id} /* {fname} */ = {{isa = PBXFileReference; lastKnownFileType = {ftype}; path = {fname}; sourceTree = \"<group>\"; }};"
        )

    build_file_lines.append(
        f"\t\t{xcassets_build_id} /* Assets.xcassets in Resources */ = {{isa = PBXBuildFile; fileRef = {xcassets_file_id} /* Assets.xcassets */; }};"
    )

    file_ref_lines.append(
        f"\t\t{product_ref_id} /* ArcaneVsSteel.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = ArcaneVsSteel.app; sourceTree = BUILT_PRODUCTS_DIR; }};"
    )
    file_ref_lines.append(
        f"\t\t{infoplist_file_id} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = \"<group>\"; }};"
    )
    file_ref_lines.append(
        f"\t\t{xcassets_file_id} /* Assets.xcassets */ = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = \"<group>\"; }};"
    )

    for name, rel_path, ftype in shared_bundle_items:
        fid = pbx_id(f"FileRef:{rel_path}")
        bid = pbx_id(f"BuildFile:{rel_path}")
        shared_group_children.append((fid, name))
        resource_build_ids.append((bid, name))
        build_file_lines.append(
            f"\t\t{bid} /* {name} in Resources */ = {{isa = PBXBuildFile; fileRef = {fid} /* {name} */; }};"
        )
        file_ref_lines.append(
            f"\t\t{fid} /* {name} */ = {{isa = PBXFileReference; lastKnownFileType = {ftype}; name = {name}; path = {rel_path}; sourceTree = \"<group>\"; }};"
        )

    group_children["App"].append((infoplist_file_id, "Info.plist"))
    group_children["App"].append((xcassets_file_id, "Assets.xcassets"))

    sub_group_blocks = []
    for grp in groups:
        gid = group_ids[grp]
        children_str = "\n".join(f"\t\t\t\t{cid} /* {cname} */," for cid, cname in group_children[grp])
        sub_group_blocks.append(
            f"""\t\t{gid} /* {grp} */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
{children_str}
\t\t\t);
\t\t\tpath = {grp};
\t\t\tsourceTree = "<group>";
\t\t}};"""
        )

    src_group_children_str = "\n".join(f"\t\t\t\t{group_ids[grp]} /* {grp} */," for grp in groups)
    shared_children_str = "\n".join(f"\t\t\t\t{fid} /* {fname} */," for fid, fname in shared_group_children)
    sources_files_str = "\n".join(f"\t\t\t\t{bid} /* {bname} in Sources */," for bid, bname in source_build_ids)
    resources_files_str = "\n".join(f"\t\t\t\t{bid} /* {bname} in Resources */," for bid, bname in resource_build_ids)

    pbxproj = f"""// !$*UTF8*$!
{{
\tarchiveVersion = 1;
\tclasses = {{
\t}};
\tobjectVersion = 56;
\tobjects = {{

/* Begin PBXBuildFile section */
{chr(10).join(build_file_lines)}
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
{chr(10).join(file_ref_lines)}
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
\t\t{frameworks_phase_id} /* Frameworks */ = {{
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
\t\t{main_group_id} = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{src_group_id} /* ArcaneVsSteel */,
\t\t\t\t{web_group_id} /* SharedGameRuntime */,
\t\t\t\t{products_group_id} /* Products */,
\t\t\t);
\t\t\tsourceTree = "<group>";
\t\t}};
\t\t{src_group_id} /* ArcaneVsSteel */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
{src_group_children_str}
\t\t\t);
\t\t\tpath = ArcaneVsSteel;
\t\t\tsourceTree = "<group>";
\t\t}};
\t\t{web_group_id} /* SharedGameRuntime */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
{shared_children_str}
\t\t\t);
\t\t\tname = SharedGameRuntime;
\t\t\tsourceTree = "<group>";
\t\t}};
\t\t{products_group_id} /* Products */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{product_ref_id} /* ArcaneVsSteel.app */,
\t\t\t);
\t\t\tname = Products;
\t\t\tsourceTree = "<group>";
\t\t}};
{chr(10).join(sub_group_blocks)}
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
\t\t{target_id} /* ArcaneVsSteel */ = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {tgt_cfg_list_id} /* Build configuration list for PBXNativeTarget "ArcaneVsSteel" */;
\t\t\tbuildPhases = (
\t\t\t\t{sources_phase_id} /* Sources */,
\t\t\t\t{frameworks_phase_id} /* Frameworks */,
\t\t\t\t{resources_phase_id} /* Resources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = ArcaneVsSteel;
\t\t\tproductName = ArcaneVsSteel;
\t\t\tproductReference = {product_ref_id} /* ArcaneVsSteel.app */;
\t\t\tproductType = "com.apple.product-type.application";
\t\t}};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
\t\t{proj_id} /* Project object */ = {{
\t\t\tisa = PBXProject;
\t\t\tattributes = {{
\t\t\t\tBuildIndependentTargetsInParallel = 1;
\t\t\t\tLastSwiftUpdateCheck = 1600;
\t\t\t\tLastUpgradeCheck = 1600;
\t\t\t\tTargetAttributes = {{
\t\t\t\t\t{target_id} = {{
\t\t\t\t\t\tCreatedOnToolsVersion = 16.0;
\t\t\t\t\t\tDevelopmentTeam = JD7HC7GF88;
\t\t\t\t\t\tProvisioningStyle = Automatic;
\t\t\t\t\t}};
\t\t\t\t}};
\t\t\t}};
\t\t\tbuildConfigurationList = {proj_cfg_list_id} /* Build configuration list for PBXProject "ArcaneVsSteel" */;
\t\t\tcompatibilityVersion = "Xcode 14.0";
\t\t\tdevelopmentRegion = en;
\t\t\thasScannedForEncodings = 0;
\t\t\tknownRegions = (
\t\t\t\ten,
\t\t\t\tBase,
\t\t\t);
\t\t\tmainGroup = {main_group_id};
\t\t\tproductRefGroup = {products_group_id} /* Products */;
\t\t\tprojectDirPath = "";
\t\t\tprojectRoot = "";
\t\t\ttargets = (
\t\t\t\t{target_id} /* ArcaneVsSteel */,
\t\t\t);
\t\t}};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
\t\t{resources_phase_id} /* Resources */ = {{
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
{resources_files_str}
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
\t\t{sources_phase_id} /* Sources */ = {{
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
{sources_files_str}
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
\t\t{proj_debug_id} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tCLANG_ENABLE_OBJC_ARC = YES;
\t\t\t\tCOMPRESS_PNG_FILES = NO;
\t\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;
\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;
\t\t\t\tENABLE_TESTABILITY = YES;
\t\t\t\tGCC_DYNAMIC_NO_PIC = NO;
\t\t\t\tGCC_OPTIMIZATION_LEVEL = 0;
\t\t\t\tGCC_PREPROCESSOR_DEFINITIONS = (
\t\t\t\t\t"DEBUG=1",
\t\t\t\t\t"$(inherited)",
\t\t\t\t);
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tMACOSX_DEPLOYMENT_TARGET = 15.0;
\t\t\t\tMTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
\t\t\t\tONLY_ACTIVE_ARCH = YES;
\t\t\t\tSTRIP_PNG_TEXT = NO;
\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";
\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{proj_release_id} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tCLANG_ENABLE_OBJC_ARC = YES;
\t\t\t\tCOMPRESS_PNG_FILES = NO;
\t\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\t\tDEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
\t\t\t\tENABLE_NS_ASSERTIONS = NO;
\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tMACOSX_DEPLOYMENT_TARGET = 15.0;
\t\t\t\tMTL_ENABLE_DEBUG_INFO = NO;
\t\t\t\tSTRIP_PNG_TEXT = NO;
\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;
\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-O";
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t}};
\t\t\tname = Release;
\t\t}};
\t\t{tgt_debug_id} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tAD_HOC_CODE_SIGNING_ALLOWED = YES;
\t\t\t\tALLOW_TARGET_PLATFORM_SPECIALIZATION = YES;
\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tCODE_SIGN_IDENTITY = "-";
\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Development";
\t\t\t\tCODE_SIGN_STYLE = Manual;
\t\t\t\t"CODE_SIGN_STYLE[sdk=iphoneos*]" = Automatic;
\t\t\t\t"DEVELOPMENT_TEAM[sdk=iphoneos*]" = JD7HC7GF88;
\t\t\t\tCOMPRESS_PNG_FILES = NO;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tENABLE_APP_SANDBOX = NO;
\t\t\t\tENABLE_HARDENED_RUNTIME = NO;
\t\t\t\tGENERATE_INFOPLIST_FILE = YES;
\t\t\t\tINFOPLIST_FILE = ArcaneVsSteel/App/Info.plist;
\t\t\t\tINFOPLIST_KEY_CFBundleDisplayName = "Arcane vs. Steel";
\t\t\t\tINFOPLIST_KEY_LSApplicationCategoryType = "public.app-category.action-games";
\t\t\t\t"INFOPLIST_KEY_UIApplicationSceneManifest_Generation[sdk=iphoneos*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UIApplicationSceneManifest_Generation[sdk=iphonesimulator*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents[sdk=iphoneos*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents[sdk=iphonesimulator*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UILaunchScreen_Generation[sdk=iphoneos*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UILaunchScreen_Generation[sdk=iphonesimulator*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UIStatusBarHidden[sdk=iphoneos*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UIStatusBarHidden[sdk=iphonesimulator*]" = YES;
\t\t\t\tINFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown";
\t\t\t\tINFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight UIInterfaceOrientationPortrait";
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = "@executable_path/Frameworks";
\t\t\t\t"LD_RUNPATH_SEARCH_PATHS[sdk=macosx*]" = "@executable_path/../Frameworks";
\t\t\t\tMACOSX_DEPLOYMENT_TARGET = 15.0;
\t\t\t\tMARKETING_VERSION = 1.0.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.arcanevssteel.app;
\t\t\t\t"PRODUCT_BUNDLE_IDENTIFIER[sdk=iphoneos*]" = com.gabugabu.arcanevssteel;
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSDKROOT = auto;
\t\t\t\tSTRIP_PNG_TEXT = NO;
\t\t\t\tSUPPORTED_PLATFORMS = "iphoneos iphonesimulator macosx";
\t\t\t\tSWIFT_EMIT_LOC_STRINGS = NO;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{tgt_release_id} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tAD_HOC_CODE_SIGNING_ALLOWED = YES;
\t\t\t\tALLOW_TARGET_PLATFORM_SPECIALIZATION = YES;
\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tCODE_SIGN_IDENTITY = "-";
\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Development";
\t\t\t\tCODE_SIGN_STYLE = Manual;
\t\t\t\t"CODE_SIGN_STYLE[sdk=iphoneos*]" = Automatic;
\t\t\t\t"DEVELOPMENT_TEAM[sdk=iphoneos*]" = JD7HC7GF88;
\t\t\t\tCOMPRESS_PNG_FILES = NO;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tENABLE_APP_SANDBOX = NO;
\t\t\t\tENABLE_HARDENED_RUNTIME = NO;
\t\t\t\tGENERATE_INFOPLIST_FILE = YES;
\t\t\t\tINFOPLIST_FILE = ArcaneVsSteel/App/Info.plist;
\t\t\t\tINFOPLIST_KEY_CFBundleDisplayName = "Arcane vs. Steel";
\t\t\t\tINFOPLIST_KEY_LSApplicationCategoryType = "public.app-category.action-games";
\t\t\t\t"INFOPLIST_KEY_UIApplicationSceneManifest_Generation[sdk=iphoneos*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UIApplicationSceneManifest_Generation[sdk=iphonesimulator*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents[sdk=iphoneos*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents[sdk=iphonesimulator*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UILaunchScreen_Generation[sdk=iphoneos*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UILaunchScreen_Generation[sdk=iphonesimulator*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UIStatusBarHidden[sdk=iphoneos*]" = YES;
\t\t\t\t"INFOPLIST_KEY_UIStatusBarHidden[sdk=iphonesimulator*]" = YES;
\t\t\t\tINFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown";
\t\t\t\tINFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight UIInterfaceOrientationPortrait";
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = "@executable_path/Frameworks";
\t\t\t\t"LD_RUNPATH_SEARCH_PATHS[sdk=macosx*]" = "@executable_path/../Frameworks";
\t\t\t\tMACOSX_DEPLOYMENT_TARGET = 15.0;
\t\t\t\tMARKETING_VERSION = 1.0.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.arcanevssteel.app;
\t\t\t\t"PRODUCT_BUNDLE_IDENTIFIER[sdk=iphoneos*]" = com.gabugabu.arcanevssteel;
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSDKROOT = auto;
\t\t\t\tSTRIP_PNG_TEXT = NO;
\t\t\t\tSUPPORTED_PLATFORMS = "iphoneos iphonesimulator macosx";
\t\t\t\tSWIFT_EMIT_LOC_STRINGS = NO;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t}};
\t\t\tname = Release;
\t\t}};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
\t\t{proj_cfg_list_id} /* Build configuration list for PBXProject "ArcaneVsSteel" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{proj_debug_id} /* Debug */,
\t\t\t\t{proj_release_id} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
\t\t{tgt_cfg_list_id} /* Build configuration list for PBXNativeTarget "ArcaneVsSteel" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{tgt_debug_id} /* Debug */,
\t\t\t\t{tgt_release_id} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
/* End XCConfigurationList section */
\t}};
\trootObject = {proj_id} /* Project object */;
}}
"""

    (XCODEPROJ_DIR / "project.pbxproj").write_text(pbxproj, encoding="utf-8")

    scheme_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1600"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES"
      buildArchitectures = "Automatic">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{target_id}"
               BuildableName = "ArcaneVsSteel.app"
               BlueprintName = "ArcaneVsSteel"
               ReferencedContainer = "container:ArcaneVsSteel.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES"
      shouldAutocreateTestPlan = "YES">
   </TestAction>
   <LaunchAction
      buildConfiguration = "Release"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{target_id}"
            BuildableName = "ArcaneVsSteel.app"
            BlueprintName = "ArcaneVsSteel"
            ReferencedContainer = "container:ArcaneVsSteel.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{target_id}"
            BuildableName = "ArcaneVsSteel.app"
            BlueprintName = "ArcaneVsSteel"
            ReferencedContainer = "container:ArcaneVsSteel.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
"""
    (SCHEMES_DIR / "ArcaneVsSteel.xcscheme").write_text(scheme_xml, encoding="utf-8")
    print(f"Generated {XCODEPROJ_DIR} with {len(source_entries)} Swift/Metal source files and exact shared game runtime.")


if __name__ == "__main__":
    generate()
