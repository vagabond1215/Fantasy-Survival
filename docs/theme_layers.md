Light Mode
  body [layer 0]
    background #F2F4F8
    text #1F2A37
    div#content [layer 1]
      text #24344A
    div#top-menu [layer 1]
      background #E4E9F3
    div#bottom-menu [layer 1]
      background #DCE2EE
    div#time-banner [layer 1]
      background #CED6E5
      border #A9B7CD
      .menu-action>.menu-trigger:hover [layer 2]
        background #1F2A3720
      .menu-action>.menu-trigger:focus-visible [layer 2]
        outline #3B6DDC
    .menu-panel [layer 1]
      background #D7DEEB
      border #A9B7CD
      shadow #1F2A3730
      button:hover [layer 2]
        background #1F2A3720
      button:focus-visible [layer 2]
        outline #3B6DDC
      .theme-toggle-button [layer 2]
        border #A9B7CD
        &.active [layer 3]
          background #38497114
          border #38497140
    .map-wrapper [layer 1]
      background #E9EEF7
      border #B4C2D8
      text #1F2A37
      .map-display [layer 2]
        background #F6F8FC
        text #24344A
    body.landing-active [layer 1]
      text #F4F7FF
      background-top #264173B5
      background-mid #1B2F55C0
      background-base #13203FBF
      background-end #0C162EBF
      div.wrap [layer 2]
        text #F1F5FF
        div.setup [layer 3]
          background-start #1F2F4FBF
          background-end #111D36E0
          border #2B3F63A0
          shadow #0C132640
          ::before [layer 4]
            border #7B8CA5
          div.card [layer 4]
            background #273C5FBA
            border #34527AD4
            inner-glow #FFFFFF1A
            &:nth-of-type(even) [layer 5]
              background #22334FBD
              border #2F466CBF
            &.hero [layer 5]
              background #6E7585
              text #F7F7FA
              .hero-settings__trigger [layer 6]
                border #7B8CA5
                background #7B8CA5
                text #FFFFFF
                &:hover [layer 7]
                  background #70829D
                  border #70829D
                &:focus-visible [layer 7]
                  outline #7FE4C8
              .hero-settings__panel [layer 6]
                border #2B3F63A0
                background #1A2B49C9
                shadow #0A1228AA
                .hero-settings__title [layer 7]
                  text #F5D68A
                .hero-settings__section-title [layer 7]
                  text #C7D3EA
                .hero-settings__theme-btn [layer 7]
                  border #7B8CA5
                  background #7B8CA5
                  text #FFFFFF
                  &:hover [layer 8]
                    border #6E809A
                    background #6E809A
                  &.is-active [layer 8]
                    border #636F85
                    background #636F85
                    text #FFFFFF
                  &:focus-visible [layer 8]
                    outline #7FE4C8
              .sub [layer 6]
                text #C7D3EA
              .section__title [layer 6]
                text #F5D68A
              .badge [layer 6]
                border #7B8CA5
                background #7B8CA5
                text #FFFFFF
                &--ok [layer 7]
                  background #7FE4C433
                  border #7FE4C466
                  text #0F3328
                &--warn [layer 7]
                  background #FFD98A3D
                  border #FFCE744F
                  text #5A4100
              .seg [layer 6]
                background #203356C6
                border #4A6296A8
                text #F1F5FF
                &:hover [layer 7]
                  border #7B8CA5
                  glow #7B8CA54C
                &.is-active [layer 7]
                  background #1B2D4EBF
                  border #7B8CA5
                  glow #7B8CA560
                .hint [layer 7]
                  text #C7D3EA
              .tile [layer 6]
                background-start #0E244DE5
                background-end #0F2F5FE0
                border #BAC6D8
                text #E0E5F2
                &:hover [layer 7]
                  background-start #143366EC
                  background-end #194078EB
                  border #CED6E5
                  glow #D7DEEB4C
                &.is-active [layer 7]
                  background-start #0A1D43F0
                  background-end #142F5CEB
                  border #E3E8F3
                  glow #E3E8F366
                &__name [layer 7]
                  text #F1F5FF
                &__desc [layer 7]
                  text #D3DBEA
              .input [layer 6]
                background #162440CC
                border #4B5F86B5
                text #F1F5FF
                &:focus [layer 7]
                  border #7B8CA5
                  glow #7B8CA54C
              .btn [layer 6]
                border #4F6AA4A8
                text #F1F5FF
                background-start #243B6DCF
                background-end #1A2F56C9
                &:focus-visible [layer 7]
                  outline #7B8CA5
                &--ghost [layer 7]
                  background #1A2D4FCC
                  border #4A6296A8
                &--primary [layer 7]
                  background #7B8CA5
                  border #7B8CA5
                  text #FFFFFF
                &--ok [layer 7]
                  background-start #7FE4C4D9
                  background-end #53C3A5CC
                  border #7FE4C480
                  text #0E2E26
              .map-tip [layer 6]
                text #C7D3EA
              .mini-map [layer 6]
                border #4F6AA480
                background-start #6C86FF33
                background-end #39B6FF1F
                inner-glow #FFFFFF14
                ::after [layer 7]
                  highlight #FFFFFF3D
              .map-preview [layer 6]
                border #5F7FBA99
                background #1A3059C7
                inner-glow #FFFFFF1C
                shadow #0A132E8A
              .difficulty-tip [layer 6]
                text #C7D3EA
              .spawn-confirm [layer 6]
                background #1B2E51C4
                border #2B3F63A0
                text #F1F5FF
                button [layer 7]
                  background #14243ED1
                  border #4F6AA480
                  text #F1F5FF
                  &:hover [layer 8]
                    border #7B8CA5
              .map-marker--spawn-outline [layer 6]
                ring #8CC9FF
                cross #F1F5FF
                halo #4B8DFF66
                shadow #040A1F8C
              .map-legend [layer 6]
                border #5F7FBA80
                background #162844C4
                inner-glow #FFFFFF12
                text #F1F5FF
                &__title [layer 7]
                  text #C7D3EA
                &__item [layer 7]
                  border #4E6CA37A
                  background #122038B8
                  inner-glow #FFFFFF0F
                  &__swatch [layer 8]
                    outline #09183080
                  &__label [layer 8]
                    text #EEF1FF

Dark Mode
  body [layer 0]
    background #101624
    text #E7ECFF
    div#content [layer 1]
      text #E0E6FF
    div#top-menu [layer 1]
      background #182338F0
    div#bottom-menu [layer 1]
      background #1B2840F0
    div#time-banner [layer 1]
      background #1F2E49F0
      border #4A5E8FBF
      .menu-action>.menu-trigger:hover [layer 2]
        background #E7ECFF1F
      .menu-action>.menu-trigger:focus-visible [layer 2]
        outline #4F83FF
    .menu-panel [layer 1]
      background #1D2A45F0
      border #4A5E8FBF
      shadow #00000033
      button:hover [layer 2]
        background #E7ECFF1F
      button:focus-visible [layer 2]
        outline #4F83FF
      .theme-toggle-button [layer 2]
        border #4A5E8FBF
        &.active [layer 3]
          background #E7ECFF24
          border #6A88C6
    .map-wrapper [layer 1]
      background #16233AF0
      border #4A5E8FBF
      text #E7ECFF
      .map-display [layer 2]
        background #1A2941
        text #E0E6FF
    body.landing-active [layer 1]
      text #F2F5FF
      background-top #2A4C84C0
      background-mid #213963C7
      background-base #16253FBF
      background-end #0F1A33BF
      div.wrap [layer 2]
        text #F2F5FF
        div.setup [layer 3]
          background-start #1D2F50D8
          background-end #0D1528E6
          border #2C4267B5
          shadow #0509138C
          ::before [layer 4]
            border #7D8DA9
          div.card [layer 4]
            background #253A5EBF
            border #33517ABF
            inner-glow #FFFFFF1A
            &:nth-of-type(even) [layer 5]
              background #1F314FBF
              border #2A456CBF
            &.hero [layer 5]
              background #757C8D
              text #F9FAFF
              .hero-settings__trigger [layer 6]
                border #7D8DA9
                background #7D8DA9
                text #101624
                &:hover [layer 7]
                  background #8898B4
                  border #8898B4
                &:focus-visible [layer 7]
                  outline #7EE6C7
              .hero-settings__panel [layer 6]
                border #2C4267B5
                background #182947D0
                shadow #030712A8
                .hero-settings__title [layer 7]
                  text #F4D88F
                .hero-settings__section-title [layer 7]
                  text #C9D5EE
                .hero-settings__theme-btn [layer 7]
                  border #7D8DA9
                  background #7D8DA9
                  text #101624
                  &:hover [layer 8]
                    border #8898B4
                    background #8898B4
                  &.is-active [layer 8]
                    border #6D7C97
                    background #6D7C97
                    text #101624
                  &:focus-visible [layer 8]
                    outline #7EE6C7
              .sub [layer 6]
                text #C9D5EE
              .section__title [layer 6]
                text #F4D88F
              .badge [layer 6]
                border #7D8DA9
                background #7D8DA9
                text #101624
                &--ok [layer 7]
                  background #7EE6C733
                  border #7EE6C766
                  text #042E22
                &--warn [layer 7]
                  background #FFC97440
                  border #FFBC5A63
                  text #2E1A00
              .seg [layer 6]
                background #1E3050CC
                border #4E6699A8
                text #F2F5FF
                &:hover [layer 7]
                  border #7D8DA9
                  glow #7D8DA960
                &.is-active [layer 7]
                  background #172847C4
                  border #7D8DA9
                  glow #7D8DA980
                .hint [layer 7]
                  text #C9D5EE
              .tile [layer 6]
                background #7D8DA9
                border #E0E6FF3D
                text #101624
                shadow #00000059
                &:hover [layer 7]
                  background #8A9AB6
                  border #E7ECFF52
                  glow #E7ECFF33
                &.is-active [layer 7]
                  background #6B7A95
                  border #E7ECFF5C
                  glow #E7ECFF47
                &__name [layer 7]
                  text #101624
                &__desc [layer 7]
                  text #101624CC
              .input [layer 6]
                background #0F1C33D1
                border #4E6699A8
                text #F2F5FF
                &:focus [layer 7]
                  border #7D8DA9
                  glow #7D8DA960
              .btn [layer 6]
                border #4F6AA4A8
                text #F2F5FF
                background-start #1F365ECF
                background-end #16294CC7
                &:focus-visible [layer 7]
                  outline #7D8DA9
                &--ghost [layer 7]
                  background #142640CC
                  border #4E6699A8
                &--primary [layer 7]
                  background #7D8DA9
                  border #7D8DA9
                  text #101624
                &--ok [layer 7]
                  background-start #7EE6C7D9
                  background-end #51C7A5CC
                  border #7EE6C780
                  text #042E22
              .map-tip [layer 6]
                text #C9D5EE
              .mini-map [layer 6]
                border #4F6AA480
                background-start #5E7BFF33
                background-end #2FA3FF24
                inner-glow #FFFFFF12
                ::after [layer 7]
                  highlight #FFFFFF3B
              .map-preview [layer 6]
                border #5F7FBA99
                background #152A4CC7
                inner-glow #FFFFFF1A
                shadow #03071399
              .difficulty-tip [layer 6]
                text #C9D5EE
              .spawn-confirm [layer 6]
                background #182C4FC7
                border #2C4267B5
                text #F2F5FF
                button [layer 7]
                  background #132440D4
                  border #4F6AA480
                  text #F2F5FF
                  &:hover [layer 8]
                    border #7D8DA9
              .map-marker--spawn-outline [layer 6]
                ring #8FCBFF
                cross #F4F7FF
                halo #4D91FF59
                shadow #040A1F80
              .map-legend [layer 6]
                border #5F7FBA80
                background #12223DC9
                inner-glow #FFFFFF12
                text #F2F5FF
                &__title [layer 7]
                  text #C9D5EE
                &__item [layer 7]
                  border #4E66997A
                  background #101D35BD
                  inner-glow #FFFFFF0F
                  &__swatch [layer 8]
                    outline #050E1F80
                  &__label [layer 8]
                    text #EEF1FF
